declare class Pushy extends NSObject {

  static alloc(): Pushy; // inherited from NSObject

  static new(): Pushy; // inherited from NSObject

  constructor();

  applicationDidFailToRegisterForRemoteNotificationsWithError(application: UIApplication, error: NSError): void;

  applicationDidReceiveRemoteNotificationFetchCompletionHandler(application: UIApplication, userInfo: NSDictionary<any, any>, completionHandler: (p1: UIBackgroundFetchResult) => void): void;

  applicationDidRegisterForRemoteNotificationsWithDeviceToken(application: UIApplication, deviceToken: NSData): void;

  getApiEndpoint(): string;

  init(application: UIApplication): this;

  isRegistered(): boolean;

  register(registrationHandler: (p1: NSError, p2: string) => void): void;

  setCustomNotificationOptions(options: any): void;

  setEnterpriseConfigWithApiEndpoint(apiEndpoint: string): void;

  setNotificationHandler(notificationHandler: (p1: NSDictionary<any, any>, p2: (p1: UIBackgroundFetchResult) => void) => void): void;

  subscribeWithTopicHandler(topic: string, handler: (p1: NSError) => void): void;

  subscribeWithTopicsHandler(topics: NSArray<string> | string[], handler: (p1: NSError) => void): void;

  unsubscribeWithTopicHandler(topic: string, handler: (p1: NSError) => void): void;

  unsubscribeWithTopicsHandler(topics: NSArray<string> | string[], handler: (p1: NSError) => void): void;
}

declare var PushyVersionNumber: number;

declare var PushyVersionString: interop.Reference<number>;
