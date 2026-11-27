package org.sapira.mediaplayer.youtube

import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import java.net.HttpURLConnection
import java.net.URL

/** Minimal HttpURLConnection-based downloader required by NewPipeExtractor. */
object SapiraNewPipeDownloader : Downloader() {

    private const val DEFAULT_USER_AGENT =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"

    override fun execute(request: Request): Response {
        val conn = URL(request.url()).openConnection() as HttpURLConnection
        try {
            conn.instanceFollowRedirects = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 20_000
            conn.requestMethod = request.httpMethod()
            conn.setRequestProperty("User-Agent", DEFAULT_USER_AGENT)

            for ((name, values) in request.headers()) {
                // HttpURLConnection decompresses gzip transparently only if we don't ask for it explicitly
                if (name.equals("Accept-Encoding", ignoreCase = true)) continue
                values.forEachIndexed { idx, value ->
                    if (idx == 0) conn.setRequestProperty(name, value) else conn.addRequestProperty(name, value)
                }
            }

            val body = request.dataToSend()
            if (body != null) {
                conn.doOutput = true
                conn.outputStream.use { it.write(body) }
            }

            val code = conn.responseCode
            if (code == 429) {
                throw ReCaptchaException("reCaptcha challenge requested", request.url())
            }

            val stream = if (code >= 400) conn.errorStream else conn.inputStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val headers = conn.headerFields.entries
                .filter { it.key != null }
                .associate { it.key!! to it.value }

            return Response(code, conn.responseMessage, headers, text, conn.url.toString())
        } finally {
            conn.disconnect()
        }
    }
}
