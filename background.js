let lastFetch = 0, test;

async function getOAuth(showPopup = false) {
    return new Promise(resolve => { 
        return chrome.identity.getAuthToken({ "interactive": showPopup }, token => {
            console.log("OAuth2 Token Granted!");
            resolve(token);
        }); 
    });
}
/*
async function authSpotify(token) {
    //8631b0b761594f4db0552bef539a7e7d
    fetch("")
}*/

async function initializeSettings() {
    chrome.storage.local.set({ 
        "color-scheme": "dark", 
        "accent-color": "255 95 31", 
        "background-image": "no_image",
        "widgets": {
            "einthusan": "no-pos",
            "weather": "no-pos"
        }
    }).then(() => {
        console.log("Settings set!");
    });
}

function insertEmails(token, tabId) {
    function getEmail(messages, index, maxIndex = 5) {
        if (index == maxIndex) return;
        
        fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messages[index]["id"]}?access_token=${token}`)
        .then(r => r.json()).then(request => {
            chrome.tabs.sendMessage(tabId, { emailData: true, res: request["payload"]["headers"], 
                                             id: request["id"], isLastEmail: index == 4 });
            getEmail(messages, ++index, maxIndex);
        }).catch(async () => {
            await getOAuth();
            getEmail(messages, index, maxIndex);
        });;
    }

    fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=-from:me&maxResults=5&alt=json&access_token=' + token)
    .then(response => response.json()).then(r => {
        if (r.resultSizeEstimate == 0) return;
        getEmail(r["messages"], 0, Math.min(5, r.resultSizeEstimate));
    }).catch(async () => {
        await getOAuth();
        insertEmails(token, tabId);
    });
}

async function fetchData(tabId) {
    const widgets = Object.keys((await chrome.storage.local.get(["widgets"]))["widgets"]);

    for (let i = 0; i < widgets.length; ++i) {
        const data = await chrome.storage.local.get([widgets[i]]);
        let save = {};
        save[widgets[i] + "Data"] = true;
        save["data"] = data[widgets[i]];
        chrome.tabs.sendMessage(tabId, save);
    }
}

async function saveData() {
    if (Date.now() - lastFetch > 120000) {
        const widgets = Object.keys((await chrome.storage.local.get(["widgets"]))["widgets"]);
        let req;
        for (let i = 0; i < widgets.length; ++i) {
            let save = {};
            switch (widgets[i]) {
                case "einthusan": 
                    req = await (await fetch("https://einthusan.tv/movie/browse/?lang=tamil")).text();
                    save[widgets[i]] = req.substring(req.indexOf("UIFeaturedFilms"), req.indexOf("dot-nav"));
                    chrome.storage.local.set(save);
                    break;
                case "weather": 
                    req = await (await fetch("https://www.google.com/search?q=weather&ie=UTF-8")).text();
                    save[widgets[i]] = req.substring(req.indexOf('">', req.indexOf('wob_t q8U8x')) + 2, req.indexOf("\"wob_d\""));
                    chrome.storage.local.set(save);
                    break;
            }
        }

        lastFetch = Date.now();
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    await getOAuth(true);
    let colorScheme = await chrome.storage.local.get(["color-scheme"]);
    if (colorScheme["color-scheme"] == null)
        initializeSettings();

    await saveData();
});

chrome.tabs.onUpdated.addListener(async (tabId, change, tab) => {
    if (tab.url == "chrome://newtab/" && change.status == 'complete') {  
        let token = await getOAuth();
        await fetchData(tab.id);
        insertEmails(token, tab.id);
        await saveData();
    }
});