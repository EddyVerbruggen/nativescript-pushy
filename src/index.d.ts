export interface TNSPushNotification {
  title: string;
  message?: string;
  aps?: {
    alert: string;
    badge: number;
    sound: string;
  };
  /**
   * NSDictionary<any, any>
   */
  ios?: any;
  /**
   *  android.os.Bundle
   */
  android?: any;
}

export declare function getDevicePushToken(): Promise<string>;

export declare function setNotificationHandler(handler: (notification: TNSPushNotification) => void): void;
