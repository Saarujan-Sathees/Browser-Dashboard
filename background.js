async function getOAuth(showPopup = false) {
    return new Promise(resolve => { 
        return chrome.identity.getAuthToken({ "interactive": showPopup }, token => {
            console.log("OAuth2 Token Granted!");
            resolve(token);
        }); 
    });
}

async function authSpotify(token) {
    //8631b0b761594f4db0552bef539a7e7d
    fetch("")
}

async function initializeSettings() {
    chrome.storage.local.set({ 
        "color-scheme": "dark", 
        "accent-color": "rgb(255 95 31)", 
        "background-image": "no_image"
    }).then(() => {
        console.log("Settings set!");
    });
}

function getEmail(tabId, token, messages, index) {
    if (index == 5) return;
    
    fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messages[index]["id"]}?access_token=${token}`)
    .then(r => r.json()).then(request => {
        chrome.tabs.sendMessage(tabId, { isEmailData: true, res: request["payload"]["headers"], 
                                         id: request["id"], isLastEmail: index == 4 });
        getEmail(tabId, token, messages, ++index);
    }).catch(async () => {
        await getOAuth();
        getEmail(tabId, token, messages, index);
    });;
}

function insertEmails(token, tabId) {
    fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=label:Forwarding&maxResults=5&alt=json&access_token=' + token)
    .then(response => response.json()).then(r => {
        if (r.resultSizeEstimate == 0) {
            fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&alt=json&access_token=' + token)
            .then(response => response.json()).then(unlabeledRes => {
                getEmail(tabId, token, unlabeledRes["messages"], 0);
            }).catch(async () => {
                await getOAuth();
                insertEmails(token, tabId);
            });;
        } else {
            getEmail(tabId, token, r["messages"], 0);
        }
    }).catch(async () => {
        await getOAuth();
        insertEmails(token, tabId);
    });
}

chrome.runtime.onInstalled.addListener(async () => {
    await getOAuth(true);
    let colorScheme = await chrome.storage.local.get(["color-scheme"]);
    if (colorScheme["color-scheme"] == null)
        initializeSettings();
});

chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (tab.url == "chrome://newtab/" && change.status == 'complete') {   
        let token = await getOAuth();
        insertEmails(token,tab.id);
    }
});
