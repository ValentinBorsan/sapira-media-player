package org.sapira.mediaplayer.ui.components

import android.annotation.SuppressLint
import android.content.Intent
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.SmartDisplay
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.key
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import org.sapira.mediaplayer.model.SapiraTheme

/**
 * Official YouTube IFrame player (Google Play compliant).
 * Loaded with an app-identity base URL + referrer policy to avoid YouTube error 152/153 in WebViews.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun YouTubeEmbedStage(
    videoId: String,
    theme: SapiraTheme,
    note: String,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(RoundedCornerShape(22.dp))
                .background(Color.Black)
                .border(1.dp, theme.c0.copy(alpha = 0.28f), RoundedCornerShape(22.dp))
        ) {
            key(videoId) {
                AndroidView(
                    factory = { ctx ->
                        WebView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            setBackgroundColor(android.graphics.Color.BLACK)
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.mediaPlaybackRequiresUserGesture = false
                            webChromeClient = WebChromeClient()
                            webViewClient = object : WebViewClient() {
                                override fun shouldOverrideUrlLoading(
                                    view: WebView,
                                    request: WebResourceRequest
                                ): Boolean {
                                    // "Watch on YouTube" / external links open outside the embed
                                    if (request.isForMainFrame) {
                                        runCatching {
                                            ctx.startActivity(
                                                Intent(Intent.ACTION_VIEW, request.url)
                                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                            )
                                        }
                                        return true
                                    }
                                    return false
                                }
                            }
                            loadDataWithBaseURL(
                                "https://${ctx.packageName}/",
                                buildEmbedHtml(videoId),
                                "text/html",
                                "UTF-8",
                                null
                            )
                        }
                    },
                    onRelease = { webView ->
                        webView.stopLoading()
                        webView.destroy()
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }

        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Rounded.SmartDisplay,
                contentDescription = null,
                tint = theme.c0,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(7.dp))
            Text(
                text = note,
                color = Color(0xFF8E9BB8),
                fontSize = 12.sp,
                modifier = Modifier.weight(1f)
            )
            Surface(
                onClick = onClose,
                shape = RoundedCornerShape(99.dp),
                color = Color.White.copy(alpha = 0.07f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Rounded.Close, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Close", color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}

private fun buildEmbedHtml(videoId: String): String = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="https://www.youtube.com/embed/$videoId?autoplay=1&playsinline=1&rel=0"
    referrerpolicy="strict-origin-when-cross-origin"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
    allowfullscreen></iframe>
</body>
</html>
""".trimIndent()
