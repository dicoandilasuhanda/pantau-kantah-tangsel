const zlib = require('node:zlib');

const COMPRESSIBLE_TYPE_RE =
  /^(text\/(?!event-stream\b)|application\/(json|javascript|manifest\+json|xml|xhtml\+xml)|image\/svg\+xml)/i;

function appendVaryAcceptEncoding(res) {
  const existing = res.getHeader('Vary');
  if (!existing) {
    res.setHeader('Vary', 'Accept-Encoding');
    return;
  }
  const values = String(existing)
    .split(',')
    .map((item) => item.trim().toLowerCase());
  if (!values.includes('accept-encoding') && !values.includes('*')) {
    res.setHeader('Vary', `${existing}, Accept-Encoding`);
  }
}

function selectEncoding(acceptEncodingHeader) {
  if (!acceptEncodingHeader) return null;
  const normalized = String(acceptEncodingHeader).toLowerCase();
  if (/\bbr\b(?!\s*;\s*q\s*=\s*0(?:\.0+)?\b)/.test(normalized)) {
    return 'br';
  }
  if (/\bgzip\b(?!\s*;\s*q\s*=\s*0(?:\.0+)?\b)/.test(normalized)) {
    return 'gzip';
  }
  return null;
}

/**
 * Middleware kompresi HTTP native Node (`br` / `gzip`) tanpa dependensi eksternal.
 * Memangkas ukuran bundel JS/CSS maupun muatan JSON besar sambil melewati unduhan biner/PDF/range.
 */
function createCompressionMiddleware({ threshold = 1024 } = {}) {
  return function compressionMiddleware(req, res, next) {
    if (req.method === 'HEAD' || req.headers.range) {
      return next();
    }

    const encoding = selectEncoding(req.headers['accept-encoding']);
    if (!encoding) {
      return next();
    }

    appendVaryAcceptEncoding(res);

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);
    const origWriteHead = res.writeHead.bind(res);

    let initialized = false;
    let ended = false;
    let compressor = null;
    let passthrough = false;
    let socketPaused = false;
    let emittingCompressorDrain = false;

    const onSocketDrain = () => {
      if (emittingCompressorDrain) return;
      if (socketPaused && compressor && !compressor.destroyed) {
        socketPaused = false;
        compressor.resume();
      }
    };

    const cleanupCompressor = () => {
      res.removeListener('drain', onSocketDrain);
      if (compressor && !compressor.destroyed) {
        compressor.destroy();
      }
    };

    const shouldCompressResponse = () => {
      if (res.statusCode < 200 || res.statusCode >= 300 || res.statusCode === 204 || res.statusCode === 206) {
        return false;
      }
      if (res.getHeader('Content-Encoding')) {
        return false;
      }
      const disposition = String(res.getHeader('Content-Disposition') || '');
      if (/^\s*attachment/i.test(disposition)) {
        return false;
      }
      const contentType = String(res.getHeader('Content-Type') || '').split(';')[0].trim();
      if (!contentType || !COMPRESSIBLE_TYPE_RE.test(contentType)) {
        return false;
      }
      const lenHeader = res.getHeader('Content-Length');
      if (lenHeader !== undefined && Number(lenHeader) < threshold) {
        return false;
      }
      return true;
    };

    const initStreamIfNeeded = (firstChunkLength) => {
      if (initialized) return;
      initialized = true;

      const lenHeader = res.getHeader('Content-Length');
      if (lenHeader === undefined && typeof firstChunkLength === 'number' && firstChunkLength < threshold) {
        passthrough = true;
        return;
      }

      if (!shouldCompressResponse()) {
        passthrough = true;
        return;
      }

      res.removeHeader('Content-Length');
      res.setHeader('Content-Encoding', encoding);

      const etag = res.getHeader('ETag');
      if (etag && !String(etag).startsWith('W/')) {
        res.setHeader('ETag', `W/${etag}`);
      }

      compressor =
        encoding === 'br'
          ? zlib.createBrotliCompress({
              params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
              },
            })
          : zlib.createGzip({ level: 6 });

      res.on('drain', onSocketDrain);
      res.once('close', cleanupCompressor);

      compressor.on('data', (compressedChunk) => {
        if (res.writableEnded || res.destroyed) return;
        // Hormati backpressure socket TCP agar buffer memori tidak membengkak
        const canContinue = origWrite(compressedChunk);
        if (!canContinue && !res.destroyed) {
          socketPaused = true;
          compressor.pause();
        }
      });

      // Teruskan sinyal drain dari compressor ke res agar stream.pipe() (mis. express.static) tidak macet
      compressor.on('drain', () => {
        if (!res.destroyed && !res.writableEnded) {
          emittingCompressorDrain = true;
          try {
            res.emit('drain');
          } finally {
            emittingCompressorDrain = false;
          }
        }
      });

      compressor.on('error', () => {
        res.removeListener('drain', onSocketDrain);
        if (!res.writableEnded) {
          origEnd();
        }
      });
    };

    res.writeHead = function wrappedWriteHead(statusCode, statusMessage, headers) {
      if (typeof statusMessage === 'object' && statusMessage !== null) {
        Object.entries(statusMessage).forEach(([k, v]) => res.setHeader(k, v));
        res.statusCode = statusCode;
      } else {
        if (headers && typeof headers === 'object') {
          Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
        }
        res.statusCode = statusCode;
        if (typeof statusMessage === 'string') {
          res.statusMessage = statusMessage;
        }
      }

      initStreamIfNeeded();
      return typeof res.statusMessage === 'string'
        ? origWriteHead(res.statusCode, res.statusMessage)
        : origWriteHead(res.statusCode);
    };

    res.write = function wrappedWrite(chunk, chunkEncoding, callback) {
      if (typeof chunkEncoding === 'function') {
        callback = chunkEncoding;
        chunkEncoding = undefined;
      }

      initStreamIfNeeded(Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk || '', chunkEncoding));

      if (passthrough || !compressor) {
        return origWrite(chunk, chunkEncoding, callback);
      }

      return compressor.write(chunk, chunkEncoding, callback);
    };

    res.end = function wrappedEnd(chunk, chunkEncoding, callback) {
      if (typeof chunk === 'function') {
        callback = chunk;
        chunk = undefined;
        chunkEncoding = undefined;
      } else if (typeof chunkEncoding === 'function') {
        callback = chunkEncoding;
        chunkEncoding = undefined;
      }

      if (ended) {
        if (typeof callback === 'function') callback();
        return res;
      }
      ended = true;

      const chunkSize = chunk
        ? Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, chunkEncoding)
        : 0;

      initStreamIfNeeded(chunkSize);

      if (passthrough || !compressor) {
        return origEnd(chunk, chunkEncoding, callback);
      }

      compressor.once('end', () => {
        res.removeListener('drain', onSocketDrain);
        if (!res.writableEnded) {
          if (typeof callback === 'function') {
            origEnd(callback);
          } else {
            origEnd();
          }
        }
      });

      if (chunk !== undefined) {
        compressor.end(chunk, chunkEncoding);
      } else {
        compressor.end();
      }
      return res;
    };

    return next();
  };
}

module.exports = {
  createCompressionMiddleware,
};
