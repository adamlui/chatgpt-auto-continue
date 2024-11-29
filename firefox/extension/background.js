// Launch CHATGPT on install
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == 'install') // to exclude updates
        chrome.tabs.create({ url: 'https://chatgpt.com/' })
})

// Sync SETTINGS to activated tabs
chrome.tabs.onActivated.addListener(activeInfo =>
    chrome.tabs.sendMessage(activeInfo.tabId, { action: 'syncConfigToUI' }));

// Init APP data
(async () => {
    const app = { latestAssetCommitHash: '9ae83fb', urls: {} }
    app.urls.assetHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-auto-continue@${app.latestAssetCommitHash}`
    const appData = await (await fetch(`${app.urls.assetHost}/app.json`)).json()
    Object.assign(app, { ...appData, urls: { ...app.urls, ...appData.urls }})
    chrome.storage.sync.set({ app }) // save to browser storage
})()
