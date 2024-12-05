window.config = {}
window.settings = {

    dependencies: {
        import(dependencies) { // { app }
            for (const name in dependencies) this[name] = dependencies[name] }
    },

    controls: { // displays top-to-bottom in toolbar menu
        get notifDisabled() { return { type: 'toggle',
            label: window.settings.getMsg('menuLabel_modeNotifs'),
            helptip: window.settings.getMsg('helptip_modeNotifs')
        }}
    },

    getMsg(key) {
        return typeof GM_info != 'undefined' ? this.dependencies.app.msgs[key] : chrome.i18n.getMessage(key) },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        if (typeof GM_info != 'undefined') // synchronously load from userscript manager storage
            keys.forEach(key => window.config[key] = GM_getValue(
                `${this.dependencies.app.configKeyPrefix}_${key}`, false))
        else // asynchronously load from browser extension storage
            return Promise.all(keys.map(key => // resolve promise when all keys load
                new Promise(resolve => // resolve promise when single key value loads
                    chrome.storage.sync.get(key, result => {
                        window.config[key] = result[key] || false ; resolve()
        }))))
    },

    save(key, val) {
        if (typeof GM_info != 'undefined') // save to userscript manager storage
            GM_setValue(`${this.dependencies.app.configKeyPrefix}_${key}`, val)
        else // save to browser extension storage
            chrome.storage.sync.set({ [key]: val })
        window.config[key] = val // save to memory
    }
};
