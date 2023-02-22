/// <reference path="https://code.jquery.com/jquery-3.2.1.min.js" />
/// <reference path="https://cdn.steemjs.com/lib/latest/steem.min.js" />
/// <reference path="https://cdn.jsdelivr.net/npm/@hiveio/keychain@1.0.7/dist/index.min.js" />
/// <reference path="https://cdnjs.cloudflare.com/ajax/libs/ace/1.15.2/ace.min.js" />

/**
 * Callback once the window.hive_keychain object is ready.
 * @param {function} callback
 */
function keychainReady(callback) {
  if (window.hive_keychain) {
    callback(window.hive_keychain);
  } else {
    setTimeout(() => {
      keychainReady(callback);
    }, 100);
  }
}

/**
 * The service for the message history.
 * The message history is an array of objects with the following properties:
 * - messageId: the unique id of the message.
 * - username: the username of the user who signed the message.
 * - keyType: the type of key used to sign the message.
 * - id: the id of the message.
 * - displayMessage: the display message.
 * - customJsonString: the custom json string.
 * - signature: the signature.
 * - timestamp: the timestamp.
 * - result: the result of the custom json operation.
 * - error: the error message if the custom json operation failed.
 * - txId: the transaction id if the custom json operation succeeded.
 * - blockNum: the block number if the custom json operation succeeded.
 **/
function createMessageHistoryService() {

  // the message history.
  var messageHistory = [];

  // load the message history from local storage.
  var messageHistoryString = localStorage.getItem('messageHistory');
  if (messageHistoryString) {
    messageHistory = JSON.parse(messageHistoryString);
  }

  // save the message history to local storage.
  function saveMessageHistory() {
    localStorage.setItem('messageHistory', JSON.stringify(messageHistory));
  }

  // add a message to the message history.
  function addOrUpdateMessage(message) {
    // check if the message already exists.
    var existingMessage = messageHistory.find(function (m) {
      return m.messageId === message.messageId;
    });
    if (existingMessage) {
      // update the existing message.
      existingMessage.username = message.username;
      existingMessage.keyType = message.keyType;
      existingMessage.id = message.id;
      existingMessage.displayMessage = message.displayMessage;
      existingMessage.customJsonString = message.customJsonString;
      existingMessage.signature = message.signature;
      existingMessage.timestamp = message.timestamp;
      existingMessage.result = message.result;
    } else {
      // add the message to the top of the array
      messageHistory.unshift(message);
    }
    saveMessageHistory();
  }

  // get the message history.
  function getMessageHistory() {
    return messageHistory;
  }

  // remove all messages from the message history.
  function clearMessageHistory() {
    messageHistory = [];
    saveMessageHistory();
  }

  // remove a message from the message history.
  function removeMessage(index) {
    messageHistory.splice(index, 1);
    saveMessageHistory();
  }

  // get last message from the message history.
  function getLastMessage() {
    return messageHistory[messageHistory.length - 1];
  }

  // return the service.
  return {
    addOrUpdateMessage: addOrUpdateMessage,
    getMessageHistory: getMessageHistory,
    clearMessageHistory: clearMessageHistory,
    removeMessage: removeMessage,
    getLastMessage: getLastMessage,
  };

}

/**
 * Render the message history using mustache.
 */
function renderMessageHistory(services) {

  // get the message history service.
  const messageHistoryService = services.messageHistoryService;

  // get the message history.
  var messageHistory = messageHistoryService.getMessageHistory();

  // render the message history.
  var messageHistoryHtml = Mustache.render(jQuery('#message-history-template').html(), {
    messageHistory: messageHistory.map((message, index) => {
      return {
        message,
        timestampLocale: new Date(message.timestamp).toLocaleString(),
        //messageClass: index === 0 ? 'active' : '',
        icon: () => {
          if (message.result) {
            if (message.result.success) {
              return 'check_circle';
            } else {
              return 'error';
            }
          } else {
            return 'hourglass_empty';
          }
        },
        icon_color: () => {
          if (message.result) {
            if (message.result.success) {
              return 'green';
            } else {
              return 'red';
            }
          } else {
            return 'grey';
          }
        },
        resultString: JSON.stringify(message.result, null, 2),
      };
    }),
  });
  jQuery('#message-history').html(messageHistoryHtml);
  $('#message-history.collapsible').collapsible();

  // attach to the remove message button.
  jQuery('.remove-message').click(function () {
    var index = jQuery(this).data('index');
    messageHistoryService.removeMessage(index);
    renderMessageHistory();
  });

  // attach to the clear message history button.
  jQuery('#clear-message-history').click(function () {
    messageHistoryService.clearMessageHistory();
    renderMessageHistory();
  });

}

jQuery(document).ready(function () {

  // Bind materialize components.
  M.AutoInit();

  // Set up the Ace editor
  function setupEditor(id) {
    var editor = ace.edit(id);
    editor.getSession().setUseWorker(false);
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    return editor;
  }
  const inputEditor = setupEditor('editor');

  const services = {
    messageHistoryService: createMessageHistoryService(),
  };

  // get the message history service.
  const messageHistoryService = services.messageHistoryService;

  // disable the run button until the keychain is ready.
  jQuery('#run').prop('disabled', true);

  // load the last message from local storage
  function setInputsFromMessage(message) {
    if (!message) return;
    jQuery('#username').val(message.username);
    jQuery('#key-type').val(message.keyType);
    jQuery('#id').val(message.id);
    jQuery('#display-message').val(message.displayMessage);
    M.updateTextFields();
    inputEditor.setValue(message.customJsonString);
  }
  setInputsFromMessage(messageHistoryService.getLastMessage());

  // render the message history.
  renderMessageHistory(services);

  // wait for the keychain to be ready.
  keychainReady((keychain) => {

    // do the handshake and enable the run button.
    keychain.requestHandshake(() => {
      jQuery('#run').prop('disabled', false);
    });

  });

  // attach to the validate-username button.
  jQuery('#validate-username').click(() => {

    // get the username.
    var username = jQuery('#username').val();

    // validate the username.
    steem.api.lookupAccounts(username, 1, (err, result) => {
      if (err) {
        alert('Error validating username.');
      } else {
        if (result.length === 0) {
          alert('Username not found.');
        } else {
          alert('Username found.');
        }
      }
    });

  });

  // attach to the run button.
  jQuery('#run').click(() => {

    // get the username.
    var username = jQuery('#username').val();

    // get the type of key
    var keyType = jQuery('#key-type').val();

    // get the id.
    var id = jQuery('#id').val();

    // get the display message.
    var displayMessage = jQuery('#display-message').val();

    // get the custom json from the editor
    var customJsonString = inputEditor.getValue();

    // validate the custom json.
    try {
      JSON.parse(customJsonString);
    } catch (err) {
      alert('Invalid custom json.');
      return;
    }

    // save all the inputs as a message in the message history.
    var message = {
      messageId: Math.random().toString(36).substring(7),
      username,
      keyType,
      id,
      displayMessage,
      customJsonString,
      timestamp: new Date().toISOString(),
    };
    const inputsString = JSON.stringify(message, null, 2);
    messageHistoryService.addOrUpdateMessage(message);

    // set the message editor to the serailized inputs.
    // messageEditor.setValue(inputsString);

    // wait for the keychain to be ready then request the custom json.
    keychainReady((keychain) => {

      keychain.requestCustomJson(username, id, keyType, customJsonString, displayMessage, (response) => {

        // set the output editor to the response.
        message.result = response;

        // save the message history to local storage.
        messageHistoryService.addOrUpdateMessage(message);

        // render the message history.
        renderMessageHistory(services);

      });

    });

  });

});
