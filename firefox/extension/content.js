// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
//  © 2023–2024 KudoAI & contributors under the MIT license

(async () => {

    document.documentElement.setAttribute( // for userscript auto-disable
        'chatgpt-auto-continue-extension-installed', true)

    // Import LIBS
    const { config, settings } = await import(chrome.runtime.getURL('lib/settings.js'))
    await import(chrome.runtime.getURL('lib/chatgpt.js'))

    // Import APP data
    const { app } = await chrome.storage.sync.get('app')

    // Add CHROME MSG listener
    chrome.runtime.onMessage.addListener(req => {
        if (req.action == 'notify') notify(req.msg, req.pos)
        else if (req.action == 'syncStorageToUI')  syncStorageToUI()
    })

    // Init SETTINGS
    await settings.load('extensionDisabled', Object.keys(settings.controls))

    // Define FUNCTIONS

    function notify(msg, pos = '', notifDuration = '', shadow = '') {
        if (config.notifDisabled && !msg.includes(chrome.i18n.getMessage('menuLabel_modeNotifs'))) return

        // Strip state word to append colored one later
        const foundState = [ chrome.i18n.getMessage('state_on').toUpperCase(),
                             chrome.i18n.getMessage('state_off').toUpperCase()
              ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || chatgpt.isDarkMode() ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const styledStateSpan = document.createElement('span')
            styledStateSpan.style.cssText = `color: ${
                foundState == 'OFF' ? '#ef4848 ; text-shadow: rgba(255, 169, 225, 0.44) 2px 1px 5px'
                                    : '#5cef48 ; text-shadow: rgba(255, 250, 169, 0.38) 2px 1px 5px' }`
            styledStateSpan.append(foundState) ; notif.append(styledStateSpan)
        }
    }

    function checkContinueBtn() {
        checkContinueBtn.status = 'active'
        if (config.extensionDisabled) { checkContinueBtn.status = 'inactive' ; return }
        const continueBtn = chatgpt.getContinueBtn()
        if (continueBtn) {
            continueBtn.click()
            notify(chrome.i18n.getMessage('notif_chatAutoContinued'), 'bottom-right')
            try { chatgpt.scrollToBottom() } catch(err) {}
            setTimeout(checkContinueBtn, 5000)
        } else setTimeout(checkContinueBtn, 500)
    }

    async function syncStorageToUI() { // on toolbar popup toggles + ChatGPT tab activations
        await settings.load('extensionDisabled', ...Object.keys(settings.controls))
        if (!config.extensionDisabled && checkContinueBtn.status != 'active') checkContinueBtn()
    }

    // Run MAIN routine

    // Add/update TWEAKS style
    const tweaksStyleUpdated = 1732583582247 // timestamp of last edit for this file's tweaksStyle
    let tweaksStyle = document.getElementById('tweaks-style') // try to select existing style
    if (!tweaksStyle || parseInt(tweaksStyle.getAttribute('last-updated')) < tweaksStyleUpdated) {
        if (!tweaksStyle) { // outright missing, create/id/attr/append it first
            tweaksStyle = document.createElement('style') ; tweaksStyle.id = 'tweaks-style'
            tweaksStyle.setAttribute('last-updated', tweaksStyleUpdated.toString())
            document.head.append(tweaksStyle)
        }
        tweaksStyle.innerText = (
            ( chatgpt.isDarkMode() ? '.chatgpt-modal > div { border: 1px solid white }' : '' )
          + '.chatgpt-modal button {'
              + 'font-size: 0.77rem ; text-transform: uppercase ;' // shrink/uppercase labels
              + `border: 2px dashed ${ chatgpt.isDarkMode() ? 'white' : 'black' } !important ;` // dash borders
              + 'border-radius: 0 !important ;' // square borders
              + 'transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out ;' // smoothen hover fx
              + 'cursor: pointer !important ;' // add finger cursor
              + 'padding: 5px !important ; min-width: 102px }' // resize
          + '.chatgpt-modal button:hover {' // add zoom, re-scheme
              + 'transform: scale(1.055) ;'
              + ( chatgpt.isDarkMode() ? ( 'background-color: #2cff00 !important ; color: black !important ;'
                                             + 'box-shadow: 2px 1px 54px #38ff00 !important ;' )
                                       : ( 'background-color: #c7ff006b !important ;'
                                             + 'box-shadow: 2px 1px 30px #97ff006b !important' )) + '}'
          + '.modal-buttons { margin-left: -13px !important }'
          + '* { scrollbar-width: thin }' // make FF scrollbar skinny to not crop toggle
        )
    }

    // Observe DOM for need to continue generating response
    if (!config.extensionDisabled) {
        checkContinueBtn()

    // NOTIFY of status on load
        notify(`${chrome.i18n.getMessage('mode_autoContinue')}: ${ chrome.i18n.getMessage('state_on').toUpperCase()}`)

    // Disable distracting SIDEBAR CLICK-ZOOM effect
        if (!document.documentElement.hasAttribute('sidebar-click-zoom-observed')) {
            new MutationObserver(mutations => mutations.forEach(({ target }) => {
                if (target.closest('[class*="sidebar"]') // include sidebar divs
                    && !target.id.endsWith('-knob-span') // exclude our sidebarToggle
                    && target.style.transform != 'none' // click-zoom occurred
                ) target.style.transform = 'none'
            })).observe(document.body, { attributes: true, subtree: true, attributeFilter: [ 'style' ]})
            document.documentElement.setAttribute('sidebar-click-zoom-observed', true)
        }
    }

})()
