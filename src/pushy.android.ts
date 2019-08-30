import * as application from "tns-core-modules/application";
import { AndroidActivityRequestPermissionsEventData } from "tns-core-modules/application";
import * as utils from "tns-core-modules/utils/utils";
import { TNSPushNotification } from "./";

declare const androidx, com: any;

const WRITE_EXTERNAL_STORAGE_PERMISSION_REQUEST_CODE = 3446; // something completely random

let notificationHandler: (notification: TNSPushNotification) => void;
let pendingNotifications: Array<TNSPushNotification> = [];

export function getDevicePushToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const onWriteExternalStoragePermissionGranted = () => {
      me.pushy.sdk.Pushy.listen(getActivity());

      // Either do this, or (preferred) move the 'register' logic into a worker / native code,
      // because it performs a network request, which is better done on a background thread.
      // Alternatively, this may be useful: me.pushy.sdk.util.PushyAsyncTask(.doInBackground)
      const policy = new android.os.StrictMode.ThreadPolicy.Builder().permitAll().build();
      android.os.StrictMode.setThreadPolicy(policy);

      // Note that this is a blocking call, so not ideal to do this on the main thread
      const deviceToken = me.pushy.sdk.Pushy.register(getActivity());
      resolve(deviceToken);
    };


    if (writeExternalStoragePermissionGranted()) {
      onWriteExternalStoragePermissionGranted();
    } else {
      requestWriteExternalStoragePermission()
          .then(granted => granted && onWriteExternalStoragePermissionGranted());
    }
  });
}

export function setNotificationHandler(handler: (notification: TNSPushNotification) => void): void {
  notificationHandler = handler;
  processPendingNotifications();
}

function getActivity() {
  return application.android.foregroundActivity || application.android.startActivity;
}

function writeExternalStoragePermissionGranted(): boolean {
  let hasPermission = android.os.Build.VERSION.SDK_INT < 23; // Android M. (6.0)
  if (!hasPermission) {
    hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED === androidx.core.content.ContextCompat.checkSelfPermission(utils.ad.getApplicationContext(), android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
  }
  return hasPermission;
}

function requestWriteExternalStoragePermission(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const onPermissionResultCallback = (args: AndroidActivityRequestPermissionsEventData) => {
      if (args.requestCode === WRITE_EXTERNAL_STORAGE_PERMISSION_REQUEST_CODE && args.grantResults.length === 1) {
        application.android.off(application.AndroidApplication.activityRequestPermissionsEvent, onPermissionResultCallback);
        resolve(args.grantResults[0] !== android.content.pm.PackageManager.PERMISSION_DENIED);
      }
    };

    // grab the permission dialog result
    application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, onPermissionResultCallback);

    // invoke the permission dialog
    androidx.core.app.ActivityCompat.requestPermissions(getActivity(), [android.Manifest.permission.WRITE_EXTERNAL_STORAGE], WRITE_EXTERNAL_STORAGE_PERMISSION_REQUEST_CODE);
  });
}

const processPendingNotifications = (): void => {
  if (notificationHandler) {
    while (pendingNotifications.length > 0) {
      notificationHandler(pendingNotifications.pop());
    }
  }
};

@JavaProxy("com.tns.plugin.puhsy.PushyPushReceiver")
class PushyPushReceiver extends android.content.BroadcastReceiver {

  onReceive(context: android.content.Context, intent: android.content.Intent) {
    try {
      const notification = <TNSPushNotification>{};
      if (intent.getExtras() == null) {
        return;
      }

      const extras = intent.getExtras();

      notification.title = intent.getStringExtra("title");
      notification.message = intent.getStringExtra("message");
      notification.android = extras;
      notification.data = {};

      const iterator = extras.keySet().iterator();
      while (iterator.hasNext()) {
        const key = iterator.next();
        if (key !== "from" && key !== "collapse_key") {
          notification.data[key] = extras.get(key);
        }
      }

      pendingNotifications.push(notification);
      processPendingNotifications();

      this.showNotification(context, notification);
    } catch (e) {
      console.log("Failed to receive Push: " + e);
    }
  }

  showNotification(context: android.content.Context, notification: TNSPushNotification): void {
    // Prepare a notification with vibration, sound and lights
    const builder = new androidx.core.app.NotificationCompat.Builder(context)
      .setAutoCancel(true)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(notification.title)
      .setContentText(notification.message)
      // .setLights(Color.RED, 1000, 1000)
      // .setVibrate(new long[]{0, 400, 250, 400}) // note that this would require the 'VIBRATE' permission
      // .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
      // this launches the app's main activity when the notification was tapped
      .setContentIntent(
          android.app.PendingIntent.getActivity(
              context,
              0,
              new android.content.Intent(context, com.tns.NativeScriptActivity.class),
              android.app.PendingIntent.FLAG_UPDATE_CURRENT));

    // Automatically configure a Notification Channel for devices running Android O+
    me.pushy.sdk.Pushy.setNotificationChannel(builder, context);

    // Get an instance of the NotificationManager service
    const notificationManager = <android.app.NotificationManager>context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);

    // Build the notification and display it (by making the ID unique we can show more than 1 notification in the tray)
    const notID = Math.floor((Math.random() * 1000) + 1);
    notificationManager.notify(notID, builder.build());
  }
}
