(async () => {

    // Import JS resources
    for (const resource of ['components/icons.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    window.env = {
        site: new URL((await chrome.tabs.query({ active: true, currentWindow: true }))[0].url)
            .hostname.split('.').slice(-2, -1)[0], // extract 2nd-level domain
        browser: { displaysEnglish: chrome.i18n.getUILanguage().startsWith('en') }
    }

    // Import APP data
    ;({ app: window.app } = await chrome.storage.local.get('app'))

    // Define FUNCTIONS

    function createMenuEntry(entryData) {
        const entry = {
            div: dom.create.elem('div', {
                id: entryData.key, class: 'menu-entry highlight-on-hover', title: entryData.helptip || '' }),
            leftElem: dom.create.elem('div', { class: `menu-icon ${ entryData.type || '' }` }),
            label: dom.create.elem('span')
        }
        entry.label.textContent = entryData.label
        if (entryData.type == 'toggle') { // add track to left, init knob pos
            entry.leftElem.append(dom.create.elem('span', { class: 'track' }))
            entry.leftElem.classList.toggle('on', settings.typeIsEnabled(entryData.key))
        } else { // add symbol to left, append status to right
            entry.leftElem.textContent = entryData.symbol || '⚙️'
            if (entryData.status) entry.label.textContent += ` — ${entryData.status}`
        }
        if (entryData.type == 'category') entry.div.append(icons.create('caretDown', { size: 11, class: 'menu-caret' }))
        entry.div.onclick = () => {
            if (entryData.type == 'category') toggleCategorySettingsVisiblity(entryData.key)
            else if (entryData.type == 'toggle') {
                entry.leftElem.classList.toggle('on')
                settings.save(entryData.key, !config[entryData.key]) ; sync.configToUI({ updatedKey: entryData.key })
                notify(`${entryData.label} ${chrome.i18n.getMessage(`state_${
                    settings.typeIsEnabled(entryData.key) ? 'on' : 'off' }`).toUpperCase()}`)
            }
        }
        entry.div.append(entry.leftElem, entry.label)
        return entry.div
    }

    function getMsg(key) { return chrome.i18n.getMessage(key) }

    function notify(msg, pos = 'bottom-right') {
        if (config.notifDisabled && !msg.includes(getMsg('menuLabel_modeNotifs'))) return
        sendMsgToActiveTab('notify', { msg, pos })
    }

    async function sendMsgToActiveTab(action, options) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        return await chrome.tabs.sendMessage(activeTab.id, { action, options })
    }

    const sync = {
        fade() {

            // Toolbar icon
            chrome.action.setIcon({ path: Object.fromEntries(
                Object.keys(chrome.runtime.getManifest().icons).map(dimension =>
                    [dimension, `../icons/${ config.extensionDisabled ? 'faded/' : '' }icon${dimension}.png`]
            ))})

            // Menu elems
            document.querySelectorAll('.logo, .menu-title, .menu-entry').forEach((elem, idx) => {
                elem.style.transition = config.extensionDisabled ? '' : 'opacity 0.15s ease-in'
                setTimeout(() => elem.classList.toggle('disabled', config.extensionDisabled),
                    config.extensionDisabled ? 0 : idx *10) // fade-out abruptly, fade-in staggered
            })
        },

        configToUI(options) { return sendMsgToActiveTab('syncConfigToUI', options) }
    }

    function toggleCategorySettingsVisiblity(category, { transitions = true, action } = {}) {
        const transitionDuration = 350, // ms
              categoryDiv = document.getElementById(category),
              caret = categoryDiv.querySelector('.menu-caret'),
              catChildrenDiv = categoryDiv.nextSibling,
              catChild = catChildrenDiv.querySelectorAll('.menu-entry')
        if (action != 'hide' && dom.get.computedHeight(catChildrenDiv) == 0) { // show category settings
            Object.assign(catChildrenDiv.style, { height: `${dom.get.computedHeight(catChild)}px`,
                transition: transitions && !env.browser.isFF ? 'height 0.25s' : '' })
            Object.assign(caret.style, { // point it down
                transform: 'rotate(0deg)', transition: transitions ? 'transform 0.15s ease-out' : '' })
            catChild.forEach(row => { // reset styles to support continuous transition on rapid show/hide
                row.style.transition = 'none' ; row.style.opacity = 0 })
            catChildrenDiv.offsetHeight // force reflow to insta-apply reset
            catChild.forEach((row, idx) => { // fade-in staggered
                if (transitions) row.style.transition = `opacity ${ transitionDuration /1000 }s ease-in-out`
                setTimeout(() => row.style.opacity = 1, transitions ? idx * transitionDuration /10 : 0)
            })
            document.querySelectorAll(`.menu-entry:has(.menu-caret):not(#${category})`).forEach(otherCategoryDiv =>
                toggleCategorySettingsVisiblity(otherCategoryDiv.id, { action: 'hide' }))
        } else { // hide category settings
            Object.assign(catChildrenDiv.style, { height: 0, transition: '' })
            Object.assign(caret.style, { transform: 'rotate(-90deg)', transition: '' }) // point it right
        }
    }

    // Run MAIN routine

    // LOCALIZE text/titles, set document lang
    document.querySelectorAll('[data-locale-text-content], [data-locale-title]').forEach(elemToLocalize =>
        Object.entries(elemToLocalize.dataset).forEach(([dataAttr, dataVal]) => {
            if (!dataAttr.startsWith('locale')) return
            const propToLocalize = dataAttr[6].toLowerCase() + dataAttr.slice(7), // convert to valid DOM prop
                  localizedTxt = dataVal.split(' ').map(key => getMsg(key) || key).join(' ')
            elemToLocalize[propToLocalize] = localizedTxt
        })
    )
    document.documentElement.lang = chrome.i18n.getUILanguage().split('-')[0]

    // Init MASTER TOGGLE
    const masterToggle = {
        div: document.querySelector('.master-toggle'),
        switch: dom.create.elem('div', { class: 'toggle menu-icon highlight-on-hover' }),
        track: dom.create.elem('span', { class: 'track' })
    }
    masterToggle.div.append(masterToggle.switch) ; masterToggle.switch.append(masterToggle.track)
    await settings.load('extensionDisabled') ; masterToggle.switch.classList.toggle('on', !config.extensionDisabled)
    masterToggle.div.onclick = () => {
        env.extensionWasDisabled = config.extensionDisabled
        masterToggle.switch.classList.toggle('on') ; settings.save('extensionDisabled', !config.extensionDisabled)
        Object.keys(sync).forEach(key => sync[key]()) // sync fade + storage to UI
        notify(`${getMsg('appName')} 🧩 ${ getMsg(`state_${ config.extensionDisabled ? 'off' : 'on' }`).toUpperCase()}`)
    }

    // Create CHILD menu entries on chatgpt.com
    const footer = document.querySelector('footer')
    if (env.site == 'chatgpt') {
        await settings.load(Object.keys(settings.controls))
        const menuEntriesDiv = dom.create.elem('div') ; footer.before(menuEntriesDiv)

        // Group controls by category
        const categorizedCtrls = {}
        Object.entries(settings.controls).forEach(([key, ctrl]) =>
            ( categorizedCtrls[ctrl.category || 'general'] ??= {} )[key] = { ...ctrl, key: key })

        // Create/append general controls
        Object.values(categorizedCtrls.general || {}).forEach(ctrl => menuEntriesDiv.append(createMenuEntry(ctrl)))

        // Create/append categorized controls
        Object.entries(categorizedCtrls).forEach(([category, ctrls]) => {
            if (category == 'general') return
            const catData = { ...settings.categories[category], key: category, type: 'category' },
                  catChildrenDiv = dom.create.elem('div', { class: 'categorized-entries' })
            if (catData.color) // color the stripe
                catChildrenDiv.style.borderImage = `linear-gradient(transparent, #${catData.color}) 30 100%`
            menuEntriesDiv.append(createMenuEntry(catData), catChildrenDiv)
            Object.values(ctrls).forEach(ctrl => catChildrenDiv.append(createMenuEntry(ctrl)))
        })
    }

    // AUTO-EXPAND categories
    document.querySelectorAll('.menu-entry:has(.menu-caret)').forEach(categoryDiv => {
        if (settings.categories[categoryDiv.id]?.autoExpand)
            toggleCategorySettingsVisiblity(categoryDiv.id, { transitions: false })
    })

    sync.fade() // based on master toggle

    // Init CHATGPT.JS footer tooltip/logo/listener
    const cjsLogo = footer.querySelector('.cjs-logo')
    cjsLogo.parentNode.title = env.browser.displaysEnglish ? '' : `${getMsg('about_poweredBy')} chatgpt.js`
    cjsLogo.src = 'https://cdn.jsdelivr.net/gh/KudoAI/chatgpt.js@745f0ca/assets/images/badges/powered-by-chatgpt.js.png'
    cjsLogo.onclick = () => { open(app.urls.chatgptjs) ; close() }

    // Init ABOUT footer icon/listener
    const aboutSpan = footer.querySelector('span[data-locale-title="menuLabel_about appName"]')
    aboutSpan.append(icons.create('questionMark', { width: 15, height: 13 }))
    aboutSpan.onclick = () => { chrome.runtime.sendMessage({ action: 'showAbout' }) ; close() }

    // Init MORE EXTENSIONS footer icon/listener
    const moreExtensionsSpan = footer.querySelector('span[data-locale-title=btnLabel_moreAIextensions]')
    moreExtensionsSpan.append(icons.create('plus'))
    moreExtensionsSpan.onclick = () => { open(app.urls.relatedExtensions) ; close() }

    // Remove LOADING SPINNER after imgs load
    Promise.all([...document.querySelectorAll('img')].map(img =>
        img.complete ? Promise.resolve() : new Promise(resolve => img.onload = resolve)
    )).then(() => document.querySelectorAll('[class^=loading]').forEach(elem => elem.remove()))

})()
