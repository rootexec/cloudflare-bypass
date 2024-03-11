const privacypass = require('./privacypass');
const cloudscraper = require('cloudscraper');
const request = require('request');

module.exports = function Cloudflare(l7) {
    var privacyPassDestegi = true;

    function yeniTokenKullan() {
        privacypass(l7.hedef);
        console.log('[cloudflare-bypass ~ privacypass]: yeni token oluşturuldu');
    }

    function bypass(proxy, uagent, callback, zorla) {
        const num = Math.random() * Math.pow(Math.random(), Math.floor(Math.random() * 10));
        let cookie = '';

        if (l7.güvenlikDuvarı[1] === 'captcha' || (zorla && privacyPassDestegi)) {
            request.get({
                url: l7.hedef + "?_asds=" + num,
                gzip: true,
                proxy: proxy,
                headers: {
                    'Connection': 'Keep-Alive',
                    'Cache-Control': 'max-age=0',
                    'Upgrade-Insecure-Requests': 1,
                    'User-Agent': uagent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US;q=0.9'
                }
            }, (hata, cevap) => {
                if (!cevap) {
                    return false;
                }

                if (cevap.headers['cf-chl-bypass'] && cevap.headers['set-cookie']) {
                    // Başarılı bypass işlemini işle
                } else {
                    if (l7.güvenlikDuvarı[1] === 'captcha') {
                        console.warn('[cloudflare-bypass]: Hedef, privacypass desteklemiyor');
                        return false;
                    } else {
                        privacyPassDestegi = false;
                    }
                }

                cookie = cevap.headers['set-cookie'].shift().split(';').shift();
                if (l7.güvenlikDuvarı[1] === 'captcha' && privacyPassDestegi || zorla && privacyPassDestegi) {
                    cloudscraper.get({
                        url: l7.hedef + "?_asds=" + num,
                        gzip: true,
                        proxy: proxy,
                        headers: {
                            'Connection': 'Keep-Alive',
                            'Cache-Control': 'max-age=0',
                            'Upgrade-Insecure-Requests': 1,
                            'User-Agent': uagent,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Accept-Language': 'en-US;q=0.9',
                            'challenge-bypass-token': l7.privacypass,
                            "Cookie": cookie
                        }
                    }, (hata, cevap, vucut) => {
                        if (hata || !cevap) return false;
                        if (cevap.headers['set-cookie']) {
                            cookie += '; ' + cevap.headers['set-cookie'].shift().split(';').shift();
                            cloudscraper.get({
                                url: l7.hedef + "?_asds=" + num,
                                proxy: proxy,
                                headers: {
                                    'Connection': 'Keep-Alive',
                                    'Cache-Control': 'max-age=0',
                                    'Upgrade-Insecure-Requests': 1,
                                    'User-Agent': uagent,
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                                    'Accept-Encoding': 'gzip, deflate, br',
                                    'Accept-Language': 'en-US;q=0.9',
                                    "Cookie": cookie
                                }
                            }, (hata, cevap, vucut) => {
                                if (hata || !cevap || cevap && cevap.statusCode == 403) {
                                    console.warn('[cloudflare-bypass ~ privacypass]: Privacypass ile bypass edilemedi, yeni token oluşturuluyor:');
                                    yeniTokenKullan();
                                    return;
                                }
                                callback(cookie);
                            });
                        } else {
                            console.log(cevap.statusCode, cevap.headers);
                            if (cevap.headers['cf-chl-bypass-resp']) {
                                let respHeader = cevap.headers['cf-chl-bypass-resp'];
                                switch (respHeader) {
                                    case '6':
                                        console.warn("[privacy-pass]: sunucu iç bağlantı hatası oluştu");
                                        break;
                                    case '5':
                                        console.warn(`[privacy-pass]: ${l7.hedef} için token doğrulaması başarısız oldu`);
                                        yeniTokenKullan();
                                        break;
                                    case '7':
                                        console.warn(`[privacy-pass]: sunucu kötü istemci isteği belirtti`);
                                        break;
                                    case '8':
                                        console.warn(`[privacy-pass]: sunucu tanınmayan yanıt kodu gönderdi`);
                                        break;
                                }
                                return bypass(proxy, uagent, callback, true);
                            }
                        }
                    });
                } else {
                    cloudscraper.get({
                        url: l7.hedef + "?_asds=" + num,
                        proxy: proxy,
                        headers: {
                            'Connection': 'Keep-Alive',
                            'Cache-Control': 'max-age=0',
                            'Upgrade-Insecure-Requests': 1,
                            'User-Agent': uagent,
                            'Accept-Language': 'en-US;q=0.9'
                        }
                    }, (hata, cevap, vucut) => {
                        if (hata || !cevap || !cevap.request.headers.cookie) {
                            if (hata) {
                                if (hata.name == 'CaptchaError') {
                                    return bypass(proxy, uagent, callback, true);
                                }
                            }
                            return false;
                        }
                        callback(cevap.request.headers.cookie);
                    });
                }
            });
        } else if (l7.güvenlikDuvarı[1] === 'uam' && !privacyPassDestegi) {
            cloudscraper.get({
                url: l7.hedef + "?_asds=" + num,
                proxy: proxy,
                headers: {
                    'Upgrade-Insecure-Requests': 1,
                    'User-Agent': uagent
                }
            }, (hata, cevap, vucut) => {
                if (hata) {
                    if (hata.name == 'CaptchaError') {
                        return bypass(proxy, uagent, callback, true);
                    }
                    return false;
                }
                if (cevap && cevap.request.headers.cookie) {
                    callback(cevap.request.headers.cookie);
                } else if (cevap && vucut && cevap.headers.server == 'cloudflare') {
                    if (cevap && vucut && /Why do I have to complete a CAPTCHA/.test(vucut) && cevap.headers.server == 'cloudflare' && cevap.statusCode !== 200) {
                        return bypass(proxy, uagent, callback, true);
                    }
                } else {

                }
            });
        } else {
            cloudscraper.get({
                url: l7.hedef + "?_asds=" + num,
                gzip: true,
                proxy: proxy,
                headers: {
                    'Connection': 'Keep-Alive',
                    'Cache-Control': 'max-age=0',
                    'Upgrade-Insecure-Requests': 1,
                    'User-Agent': uagent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US;q=0.9'
                }
            }, (hata, cevap, vucut) => {
                if (hata || !cevap || !vucut || !cevap.headers['set-cookie']) {
                    if (cevap && vucut && /Why do I have to complete a CAPTCHA/.test(vucut) && cevap.headers.server == 'cloudflare' && cevap.statusCode !== 200) {
                        return bypass(proxy, uagent, callback, true);
                    }
                    return false;
                }
                cookie = cevap.headers['set-cookie'].shift().split(';').shift();
                callback(cookie);
            });
        }
    }

    return bypass;
}
