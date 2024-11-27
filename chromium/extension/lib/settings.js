const config = {}
const settings = {

    controls: { // displays top-to-bottom in toolbar menu
        get notifDisabled() { return { type: 'toggle',
            label: settings.getMsg('menuLabel_modeNotifs'),
            helptip: settings.getMsg('helptip_modeNotifs') }}
    },

    getMsg(key) {
        return typeof chrome != 'undefined' && chrome.runtime ? chrome.i18n.getMessage(key)
            : settings.appProps.msgs[key] // assigned from app.msgs in userscript
    },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        if (typeof chrome != 'undefined' && !chrome.runtime) // synchronously load from userscript manager storage
            keys.forEach(key => config[key] = GM_getValue(settings.appProps.configKeyPrefix + '_' + key, false))
        else return Promise.all(keys.map(key => // resolve promise when all keys load from Chrome storage
            new Promise(resolve => // resolve promise when single key value loads
                chrome.storage.sync.get(key, result => { // load from Chrome
                    config[key] = result[key] || false ; resolve()
    }))))},

    save(key, val) {
        if (typeof chrome != 'undefined' && !chrome.runtime) // save to userscript manager storage
            GM_setValue(settings.appProps.configKeyPrefix + '_' + key, val)
        else // save to Chrome storage
            chrome.storage.sync.set({ [key]: val })
        config[key] = val // save to memory
    }
}

window.config = config ; window.settings = settings;
