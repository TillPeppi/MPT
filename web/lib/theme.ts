export const THEME_KEY = "mpt-theme";

/**
 * Läuft inline im <head>, bevor die Seite gezeichnet wird (kein Aufblitzen des falschen Themes).
 * Gespeicherte Wahl > prefers-color-scheme > dunkel. localStorage kann blockiert sein → try/catch.
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');var t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark'}d.setAttribute('data-theme',t)})();`;
