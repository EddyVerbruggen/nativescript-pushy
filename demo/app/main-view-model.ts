import { LocalNotifications } from "nativescript-local-notifications";
import { getDevicePushToken, setNotificationHandler } from "nativescript-pushy";
import { Observable } from "tns-core-modules/data/observable";

export class HelloWorldModel extends Observable {
  public message: string;

  constructor() {
    super();

    setNotificationHandler(notification => {
      console.log(`Notification received: ${JSON.stringify(notification)}`);

      setTimeout(() => {
        alert({
          title: "Notification received",
          message: JSON.stringify(notification),
          okButtonText: "OK"
        });
      }, 500);
    });
  }

  public doScheduleLocalNotification(): void {
    LocalNotifications.schedule([{
      id: 1,
      title: "Local FTW",
      body: "I'm a local notification",
      at: new Date(new Date().getTime() + (10 * 1000)) // 10 seconds from now
    }]).then(() => console.log("Will show a local notification in 10 seconds"));
  }

  public doGetDevicePushToken(): void {
    getDevicePushToken()
        .then(token => {
          console.log(`getDevicePushToken success, token: ${token}`);
          this.set("message", "token: " + token);
        })
        .catch(err => this.set("message", err));
  }
}
