package com.geoengage

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.geoengage.indooratlas.IndoorAtlasPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(IndoorAtlasPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
    createNotificationChannel()
  }

  /**
   * Create notification channel for Android 8.0+ (API 26+)
   * This MUST be called before any notifications can be displayed
   */
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channelId = "geoengage_offers"
      val channelName = "GeoEngage Offers"
      val channelDescription = "Notifications for zone-based offers and alerts"
      val importance = NotificationManager.IMPORTANCE_HIGH

      val channel = NotificationChannel(channelId, channelName, importance).apply {
        description = channelDescription
        enableLights(true)
        enableVibration(true)
      }

      val notificationManager = getSystemService(NotificationManager::class.java)
      notificationManager?.createNotificationChannel(channel)
    }
  }
}
