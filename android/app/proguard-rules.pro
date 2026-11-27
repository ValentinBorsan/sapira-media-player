# Sapira Media Player ProGuard / R8 Rules
-keep class org.sapira.mediaplayer.service.** { *; }
-dontwarn java.lang.invoke.StringConcatFactory

# NewPipeExtractor + Rhino JS engine (full flavor only; harmless for play flavor)
-keep class org.schabi.newpipe.extractor.** { *; }
-keep class org.mozilla.javascript.** { *; }
-keep class org.mozilla.classfile.ClassFileWriter
-keep class org.ocpsoft.prettytime.i18n.** { *; }
-dontwarn org.mozilla.javascript.**
-dontwarn org.mozilla.classfile.**
-dontwarn java.beans.**
-dontwarn javax.script.**
-dontwarn javax.lang.model.**
-dontwarn jdk.dynalink.**
-dontwarn com.google.re2j.**
-dontwarn org.jspecify.**
-dontwarn javax.annotation.**
