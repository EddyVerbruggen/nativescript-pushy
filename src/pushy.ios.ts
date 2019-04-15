import * as application from "tns-core-modules/application/application";
import { TNSPushNotification } from "./";

let notificationHandler: (notification: TNSPushNotification) => void;
let pendingNotifications: Array<TNSPushNotification> = [];
let latestDevicePushToken: string;
let latestDevicePushTokenError: string;
let getDevicePushTokenResolve: any;
let getDevicePushTokenReject: any;
let pushy;

function getAppDelegate() {
  // Play nice with other plugins by not completely ignoring anything already added to the appdelegate
  if (application.ios.delegate === undefined) {

    @ObjCClass(UIApplicationDelegate)
    class UIApplicationDelegateImpl extends UIResponder implements UIApplicationDelegate {
    }

    application.ios.delegate = UIApplicationDelegateImpl;
  }
  return application.ios.delegate;
}

getAppDelegate().prototype.applicationWillEnterForeground = (application: UIApplication) => {
  UIApplication.sharedApplication.applicationIconBadgeNumber = 0;
};

const wireNotificationHandler = () => {
  pushy = Pushy.alloc().init(UIApplication.sharedApplication);

  // we need to do this here, otherwise a killed app will not receive the notification details upon tap
  pushy.register((error: NSError, deviceToken: string) => {
    if (error !== null) {
      if (getDevicePushTokenReject) {
        getDevicePushTokenReject(error.localizedDescription);
        getDevicePushTokenReject = undefined;
      } else {
        latestDevicePushTokenError = error.localizedDescription;
      }
      latestDevicePushToken = undefined;
    } else {
      if (getDevicePushTokenResolve) {
        getDevicePushTokenResolve(deviceToken);
        getDevicePushTokenResolve = undefined;
      } else {
        latestDevicePushToken = deviceToken;
      }
      latestDevicePushTokenError = undefined;
    }
  });

  pushy.setNotificationHandler((data: NSDictionary<any, any>, completionHandler: (backgroundFetchResult: UIBackgroundFetchResult) => void) => {
    const aps: NSDictionary<any, any> = data.objectForKey("aps");
    const notification = <TNSPushNotification>{
      title: data.objectForKey("title"),
      message: data.objectForKey("message"),
      aps: {
        alert: aps.objectForKey("alert"),
        badge: aps.objectForKey("badge"),
        sound: aps.objectForKey("sound")
      },
      ios: data
    };

    pendingNotifications.push(notification);
    processPendingNotifications();
    completionHandler(UIBackgroundFetchResult.NewData);
  });
};

if (UIApplication.sharedApplication) {
  wireNotificationHandler();
} else {
  application.on("launch", () => wireNotificationHandler());
}

export function getDevicePushToken(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (latestDevicePushTokenError) {
      reject(latestDevicePushTokenError);
    } else if (latestDevicePushToken) {
      resolve(latestDevicePushToken);
    } else {
      // keep the promise around, and resolve when we actually have the token
      getDevicePushTokenResolve = resolve;
      getDevicePushTokenReject = reject;
    }
  });
}

export function setNotificationHandler(handler: (notification: TNSPushNotification) => void): void {
  notificationHandler = handler;
  while (pendingNotifications.length > 0) {
    notificationHandler(pendingNotifications.pop());
  }
  processPendingNotifications();
}

const processPendingNotifications = (): void => {
  if (notificationHandler) {
    while (pendingNotifications.length > 0) {
      notificationHandler(pendingNotifications.pop());
    }
  }
};
