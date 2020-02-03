class ChatApp {
  constructor() {
    this.messageTextarea = document.getElementById('messageTextarea');
    this.sendButton = document.getElementById('send');
    this.messages = document.getElementById('messages');
    this.messageFeed = document.getElementById('messageFeed');

    this.authenticateUser();
  }

  scrollTo(position) {
    this.messageFeed.scrollTop = position;
  }

  isFeedAtTop() {
    return 0 === this.messageFeed.scrollTop;
  }

  isFeedAtBottom() {
    return (this.messageFeed.offsetHeight+this.messageFeed.scrollTop)===this.messageFeed.scrollHeight;
  }

  scrollFeedToBottom() {
    this.scrollTo(this.messageFeed.scrollHeight);
  }

  authenticateUser() {
    this.joinConversation({
      name: userName,
      display_name: displayName,
      conversation_id: conversationId,
      client_token: clientToken
    });
  }

  joinConversation(user) {
    var { client_token, conversation_id } = user;

    new NexmoClient({ debug: true })
      .login(client_token)
      .then(app => {
        console.log('*** Logged into app', app);
        return app.getConversation(conversation_id);
      })
      .then((conversation) => {
        console.log('*** Joined conversation', conversation);
        this.setupConversationEvents(conversation, user);
        this.setupUserEvents();
      })
      .catch(this.errorLogger);
  }

  setupConversationEvents(conversation, user) {
    this.conversation = conversation;
    this.user = user;

    conversation.on('text', (sender, message) => {
      console.log('*** Message received', sender, message);
      var feedAtBottom = this.isFeedAtBottom();
      this.messageFeed.innerHTML = this.messageFeed.innerHTML + this.senderMessage(user, sender, message);

      if (feedAtBottom) {
        this.scrollFeedToBottom();
      }
    });

    conversation.on("member:joined", (member, event) => {
      console.log(`*** ${member.user.name} joined the conversation`);
      var feedAtBottom = this.isFeedAtBottom();
      this.messageFeed.innerHTML = this.messageFeed.innerHTML + this.memberJoined(member, event);

      if (feedAtBottom) {
        this.scrollFeedToBottom();
      }
    });

    this.showConversationHistory(conversation, user);
  }

  showConversationHistory(conversation, user) {
    conversation
      .getEvents({ page_size: 20, order: 'desc' })
      .then((eventsPage) => {
        this.lastPage = eventsPage;
        var eventsHistory = "";

        eventsPage.items.forEach((value, key) => {
          if (conversation.members.get(value.from)) {
            switch (value.type) {
              case 'text':
                eventsHistory = this.senderMessage(user, conversation.members.get(value.from), value) + eventsHistory;
                break;
              case 'member:joined':
                eventsHistory = this.memberJoined(conversation.members.get(value.from), value) + eventsHistory;
                break;
            }
          }
        });

        this.messageFeed.innerHTML = eventsHistory + this.messageFeed.innerHTML;

        this.scrollFeedToBottom();
      })
      .catch(this.errorLogger);
  }

  setupUserEvents() {
    this.sendButton.addEventListener('click', () => {
      this.conversation.sendText(this.messageTextarea.value)
        .then(() => {
            this.eventLogger('text')();
            this.messageTextarea.value = '';
        })
        .catch(this.errorLogger);
    });

    this.messageTextarea.addEventListener('keydown', event => {
      if (event.keyCode === 13) {
        this.conversation.sendText(this.messageTextarea.value)
          .then(() => {
            this.eventLogger('text')();
            this.messageTextarea.value = '';
          })
          .catch(this.errorLogger);
      }
    });
  
    this.messageFeed.addEventListener("scroll", () => {
      this.scrollHeight = this.messageFeed.scrollHeight;

      if (this.isFeedAtTop() && this.lastPage.hasNext()) {
        this.lastPage
          .getNext()
          .then((eventsPage) => {
            this.lastPage = eventsPage;
            var moreEvents = "";

            eventsPage.items.forEach((value, key) => {
              if (this.conversation.members.get(value.from)) {
                switch (value.type) {
                  case 'text':
                    moreEvents = this.senderMessage(this.user, this.conversation.members.get(value.from), value) + moreEvents;
                    break;
                  case 'member:joined':
                    moreEvents = this.memberJoined(this.conversation.members.get(value.from), value) + moreEvents;
                    break;
                }
              }
            });

            this.messageFeed.innerHTML = moreEvents + this.messageFeed.innerHTML;

            this.scrollTo(this.messageFeed.scrollHeight-this.scrollHeight);
          })
          .catch(this.errorLogger);
      }
    });
  }

  errorLogger(error) {
    console.log(error);
  }

  eventLogger(event) {
    return () => {
      console.log("'%s' event was sent", event);
    }
  }

  memberJoined(member, event) {
    const date = new Date(Date.parse(event.timestamp));

    return `<li class="my-2 text-center">` +
    `<p>${member.display_name} joined the conversation <small>@ ${date.toLocaleString('en-GB')}</small></p>` +
    `</li>`;
  }

  senderMessage(user, sender, message) {
    const date = new Date(Date.parse(message.timestamp));
    var output = '';

    if (user.name === sender.user.name) {
      output = `<li class="media my-3">` +
      `<img src="https://api.adorable.io/avatars/64/${btoa(sender.display_name)}.png" class="mr-3" alt="" />` +
      `<div class="media-body">` +
      `<h5 class="mt-0 mb-1">${sender.display_name} <small>@ ${date.toLocaleString('en-GB')}</small></h5>` +
      message.body.text +
      `</div>` +
      `</li>`;
    } else {
      output = `<li class="media my-3">` +
      `<div class="media-body text-right">` +
      `<h5 class="mt-0 mb-1">${sender.display_name} <small>@ ${date.toLocaleString('en-GB')}</small></h5>` +
      message.body.text +
      `</div>` +
      `<img src="https://api.adorable.io/avatars/64/${btoa(sender.display_name)}.png" class="ml-3" alt="" />` +
      `</li>`;
    }

    return output;
  }
}

new ChatApp();
