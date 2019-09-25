export interface TNSPushNotification {
  title: string;
  message?: string;
  foreground: boolean;
  appLaunchedByNotification?: boolean;
  aps?: {
    alert: string;
    badge: number;
    sound: string;
  };
  data?: {};
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

export declare function showNotificationWhenAppInForeground(show: boolean): void;
