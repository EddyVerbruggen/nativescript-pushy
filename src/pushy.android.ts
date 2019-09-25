import { ApplicationEventData } from "tns-core-modules/application";
import * as application from "tns-core-modules/application";
import { AndroidActivityRequestPermissionsEventData, LaunchEventData } from "tns-core-modules/application";
import * as utils from "tns-core-modules/utils/utils";
import { TNSPushNotification } from "./";

declare const androidx, com: any;

const WRITE_EXTERNAL_STORAGE_PERMISSION_REQUEST_CODE = 3446; // something completely random

let notificationHandler: (notification: TNSPushNotification) => void;
let pendingNotifications: Array<TNSPushNotification> = [];
let appInForeground = false;
let showForegroundNotifications = true;

application.on(application.resumeEvent, (args: ApplicationEventData) => appInForeground = true);
application.on(application.suspendEvent, () => appInForeground = false);

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
      const deviceToken = me.pushy.sdk.Pushy.register(utils.ad.getApplicationContext());
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
  const extras = getActivity().getIntent().getExtras();
  if (extras && extras.getBoolean("push_tapped")) {
    const notification = transformNativeNotificationIntoTNSPushNotification(extras);
    if (notification) {
      notification.foreground = true;
      pendingNotifications.push(notification);
    }
  }
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

const transformNativeNotificationIntoTNSPushNotification = (extras?: android.os.Bundle): TNSPushNotification => {
  if (!extras) {
    return null;
  }

  const notification = <TNSPushNotification>{};

  notification.title = extras.getString("title");
  notification.message = extras.getString("message");
  notification.appLaunchedByNotification = extras.getBoolean("push_tapped");
  notification.android = extras;
  notification.data = {};

  const iterator = extras.keySet().iterator();
  while (iterator.hasNext()) {
    const key = iterator.next();
    if (key !== "from" && key !== "collapse_key" && key !== "push_tapped") {
      notification.data[key] = extras.get(key);
    }
  }
  return notification;
};

@JavaProxy("com.tns.plugin.pushy.PushyPushReceiver")
class PushyPushReceiver extends android.content.BroadcastReceiver {

  onReceive(context: android.content.Context, intent: android.content.Intent) {
    try {
      const notification = transformNativeNotificationIntoTNSPushNotification(intent.getExtras());
      notification.foreground = appInForeground;
      // TODO only when notification was tapped..
      if (notification) {
        if (appInForeground) {
          pendingNotifications.push(notification);
          processPendingNotifications();
        }
        console.log("TCL: PushyPushReceiver -> onReceive -> showForegroundNotifications", showForegroundNotifications);
        if (!appInForeground || showForegroundNotifications) {
          this.showNotification(context, intent.getExtras(), notification);
        }
        
      }
    } catch (e) {
      console.log("Failed to receive Push: " + e);
    }
  }

  showNotification(context: android.content.Context, extras: android.os.Bundle, notification: TNSPushNotification): void {
    const launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getApplicationContext().getPackageName());
    launchIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);

    // make the notification data available to the launch intent
    launchIntent.putExtras(extras);
    launchIntent.putExtra("push_tapped", true);

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
                launchIntent,
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

export function showNotificationWhenAppInForeground(show: boolean): void {
  showForegroundNotifications = show;
  console.log("TCL: showForegroundNotifications", showForegroundNotifications);
}