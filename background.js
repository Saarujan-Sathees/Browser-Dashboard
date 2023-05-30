

function insertProfileData(token, tabId) {
    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token).then(response => response.json()).then(json => {
        chrome.tabs.sendMessage(tabId, { isProfileData: true, body: json });
    });
}

function getEmail(tabId, token, messages, index) {
    if (index == 5) return;
    
    fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messages[index]["id"]}?access_token=${token}`)
    .then(r => r.json()).then(request => {
        chrome.tabs.sendMessage(tabId, { isProfileData: false, res: request["payload"]["headers"], 
                                         id: request["id"], isLastEmail: index == 4 });
        getEmail(tabId, token, messages, ++index);
    });
}

function insertEmails(token, tabId) {
    fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=label:Forwarding&maxResults=5&alt=json&access_token=' + token)
    .then(response => response.json()).then(r => {
        console.log(r.resultSizeEstimate);
        if (r.resultSizeEstimate == 0) {
            fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&alt=json&access_token=' + token)
            .then(response => response.json()).then(unlabeledRes => {
                getEmail(tabId, token, unlabeledRes["messages"], 0);
            });
        } else {
            getEmail(tabId, token, r["messages"], 0);
        }
    });
}

chrome.runtime.onInstalled.addListener(async () => {
    await chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        console.log("OAuth2 Token Granted!");
    });
});

chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (tab.url == "chrome://newtab/" && change.status == 'complete') {   
        await chrome.identity.getAuthToken({ interactive: false }, async (token) => {
            insertProfileData(token, tab.id);
            insertEmails(token,tab.id);
        });
    }
});