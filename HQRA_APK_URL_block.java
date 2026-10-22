// ===== সদস্য APK: ওয়েবসাইট খোলা (একবার APK বসালে আর কখনো নতুন APK লাগবে না) =====
// Sketchware: সদস্য প্রজেক্ট > MainActivity > onCreate > "add source directly" ব্লকে বসান।
// আগের webview1.loadUrl("file:///android_asset/member.html") লাইনটা মুছে এই ব্লকটা দিন।
// (webview1 নামটা আপনার WebView-এর নামের সাথে মিলিয়ে নিন)
// দ্রষ্টব্য: এটা আমি আসল ফোনে পরীক্ষা করিনি। আগে নিজের ফোনে দেখে তারপর সদস্যদের দিন।

webview1.getSettings().setJavaScriptEnabled(true);
webview1.getSettings().setDomStorageEnabled(true);
webview1.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
final String HQRA_SITE = "https://hqrafoundation.github.io/hqrafoundation/";
final String HQRA_LOCAL = "file:///android_asset/member.html";
boolean hqOnline = false;
try {
    android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(android.content.Context.CONNECTIVITY_SERVICE);
    android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
    hqOnline = (ni != null && ni.isConnected());
} catch (Exception e) {}
webview1.loadUrl(hqOnline ? HQRA_SITE : HQRA_LOCAL);
