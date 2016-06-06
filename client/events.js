class Events {

  constructor() {
    this.subscriberIndex = 0;
    this.subscriptions = {};
    // 'subscriptions' maps publicationName to a list of subscriptions
    // A subscription is an object { subscriberId: ..., callback, ... }
    this.queuedData = {};
    // queuedData maps publicationName to a list of data points to publish
  }

  publish(publicationName, data) {
    // console.log('Publishing data to publication:', publicationName, data);
    const subscriptions = this.subscriptions[publicationName];
    if (subscriptions && subscriptions.length) {
      subscriptions.forEach((subscription) => {
        // console.log('Calling subscription with data:', subscription, data);
        subscription.callback(data);
      });
    } else {
      // No one is subscribed to this publication;
      // let's queue the data and send it as soon as someone subscribes
      if (!this.queuedData[publicationName]) {
        this.queuedData[publicationName] = [];
      }
      this.queuedData[publicationName].push(data);
    }
  }

  subscribe(publicationName, callback) {
    if (this.subscriptions[publicationName] === undefined) {
      this.subscriptions[publicationName] = [];
    }
    const subscriberId = this.subscriberIndex;
    this.subscriptions[publicationName].push({ subscriberId, callback });
    this.subscriberIndex += 1;
    // Send any queued data
    if (this.queuedData[publicationName]) {
      this.queuedData[publicationName].forEach((datum) => {
        // console.log('Calling subscription with data (delayed):', { subscriberId }, datum);
        callback(datum);
      });
      this.queuedData[publicationName] = [];
    }
    return subscriberId;
  }

  unsubscribe(publicationName, subscriberId) {
    const subscriptions = this.subscriptions[publicationName];
    if (subscriptions && subscriptions.length) {
      for (let i = 0; i < subscriptions.length; i++) {
        if (subscriptions[i].subscriberId === subscriberId) {
          subscriptions.splice(i, 1);
          return;  // Are we sure that a subscriber can only occur once? Switch to objects?
        }
      }
    }
  }

}

const events = new Events();

export default events;
