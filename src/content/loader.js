// src/content/loader.js — classic content script (NO top-level import).
// Chrome MV3 content scripts are NOT ES modules and ignore content_scripts[].type,
// so a top-level `import` would throw "Cannot use import statement outside a module"
// and kill the whole script. Instead we dynamic-import() the real entry module — which
// IS allowed in a classic script — resolving it via the extension URL. index.js and its
// import chain load as real modules through web_accessible_resources.
import(chrome.runtime.getURL('src/content/index.js')).catch((e) => {
  console.error('[cw-translate] failed to load content module', e)
})
