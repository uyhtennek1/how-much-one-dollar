const EXCHANGE_RATE_APIS = {
    exchangerate_api: {
        api_key: '',
        source_url: function(baseCurrency, primaryCurrency) {
            return `https://open.er-api.com/v6/latest/${baseCurrency}`;
        },
        getApiUrl: function(baseCurrency) {
            return `https://open.er-api.com/v6/latest/${baseCurrency}`;
        }
    }
};

// Rates are considered outdated 40 minutes after fetching
const RATE_KEEP_TIME = 10_000; // prouction: 40 * 60 * 1000;

let baseCurrency = 'hkd';
let sourceApiName = 'exchangerate_api';
let currencyList = ['usd', 'cny', 'jpy', 'twd', 'aud', 'gbp', 'eur'];

let exchangeRates = {};
let earliestFetchTime;

async function loadSyncData() {
    try {
        const item = await chrome.storage.sync.get(['base_currency', 'source_api', 'currency_list']);
        if (item.hasOwnProperty('base_currency')) {
            baseCurrency = item['base_currency'];
        }
        if (item.hasOwnProperty('source_api')) {
            sourceApiName = item['source_api'];
        }
        if (item.hasOwnProperty('currency_list')) {
            currencyList = item['currency_list'];
        }
    }
    catch(err) {
        console.error("Failed loading data from Chrome Sync: " + err);
    }
}

async function loadLocalData() {
    try {
        const item = await chrome.storage.local.get(['exchange_rates']);
        if (item.hasOwnProperty('exchange_rates')) {
            exchangeRates = item['exchange_rates'];
            cleanExchangeRates();
        }
    }
    catch (err) {
        console.error("Failed loading data from chrome.local: " + err);
    }
}

async function updateExchangeRates() {
    if (sourceApiName === 'exchangerate_api') {
        try {
            const res = await fetch(EXCHANGE_RATE_APIS[sourceApiName].getApiUrl(baseCurrency));
            const data = await res.json();

            if (data.result !== 'success')
                throw new Error(`Got '${data.result}' from API response.`);

            const fetchTime = Date.now();

            if (!earliestFetchTime)
                earliestFetchTime = fetchTime;

            currencyList.forEach(x => {
                const pair = `${baseCurrency}_${x}`;

                if (!exchangeRates[pair]) {
                    exchangeRates[pair] = {};
                }

                exchangeRates[pair][sourceApiName] = {
                    rate: data.rates[x.toUpperCase()],
                    updatedTime: fetchTime
                };
            });
        }
        catch (err) {
            console.error(`Failed fetching data from '${sourceApiName}': ${err}`);
            return false;
        }
    }
    return true;
}

function cleanExchangeRates() {
    let newEarlisetFetchTime;

    for (const pair in exchangeRates) {
        for (const src in exchangeRates[pair]) {
            const updatedTime = exchangeRates[pair][src].updatedTime;
            if (Date.now() >= updatedTime + RATE_KEEP_TIME) {
                delete exchangeRates[pair][src];
            }
            else if (!newEarlisetFetchTime || updatedTime < newEarlisetFetchTime) {
                newEarlisetFetchTime = updatedTime;
            }
        }
    }

    earliestFetchTime = newEarlisetFetchTime;
}

async function getExchangeRates() {
    const res = {};

    if (currencyList.some(x => {
        const pair = `${baseCurrency}_${x}`;

        if (!exchangeRates.hasOwnProperty(pair) ||
            !exchangeRates[pair].hasOwnProperty(sourceApiName) ||
            !exchangeRates[pair][sourceApiName].hasOwnProperty('updatedTime')
        ) return true;

        const rateUpdatedTime = exchangeRates[pair][sourceApiName]['updatedTime'];
        return Date.now() >= rateUpdatedTime + RATE_KEEP_TIME;
    })) {
        cleanExchangeRates();
        await updateExchangeRates();
        chrome.storage.local.set({'exchange_rates': exchangeRates});
    }

    currencyList.forEach(x => {
        res[x] = exchangeRates[`${baseCurrency}_${x}`][sourceApiName].rate;
    });

    return res;
}

const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);

chrome.runtime.onStartup.addListener(keepAlive);

keepAlive();
(async function() {

    await Promise.all([loadLocalData(), loadSyncData()]);

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

        if (msg.greeting === 'list') {
            (async function() {
                const rates = await getExchangeRates();
                sendResponse({
                    base_currency: baseCurrency,
                    currency_rates: rates,
                    fetch_time: earliestFetchTime,
                    fetch_from: EXCHANGE_RATE_APIS[sourceApiName].source_url(baseCurrency),
                    current_list: currencyList
                });
            })();
            return true;
        }

        else if (msg.greeting === 'get-base-currency') {
            sendResponse(baseCurrency);
            return true;
        }

        else if (msg.greeting === 'set-base-currency') {
            const oldCurrency = baseCurrency;
            baseCurrency = msg.currency;

            sendResponse({ old_currency: oldCurrency, new_currency: baseCurrency});
            chrome.storage.sync.set({ base_currency: baseCurrency });
            return true;
        }

        else if (msg.greeting === 'reorder-list') {
            currencyList.splice(msg.to, 0, currencyList.splice(msg.from, 1)[0]);

            const res = {};
            currencyList.forEach(x => {
                res[x] = exchangeRates[`${baseCurrency}_${x}`][sourceApiName].rate;
            });
            sendResponse(res);
            
            return true;
        }

        else if (msg.greeting === 'get-current-rates') {
            const res = {};

            currencyList.forEach(x => {
                const pair = `${baseCurrency}_${x}`;
                
                if (exchangeRates.hasOwnProperty(pair) &&
                    exchangeRates[pair].hasOwnProperty(sourceApiName) &&
                    exchangeRates[pair][sourceApiName].hasOwnProperty('rate')
                ) {
                    res[x] = exchangeRates[`${baseCurrency}_${x}`][sourceApiName].rate;
                }
            });

            sendResponse(res);
            return true;
        }

        else if (msg.greeting === 'replace-foreign-currency') {
            const currency = msg.with_currency;

            const baseCurrencyIndexInList = currencyList.indexOf(baseCurrency);
            if (baseCurrencyIndexInList >= 0) {
                currencyList[baseCurrencyIndexInList] = currency;
                chrome.storage.sync.set({ currency_list: currencyList });
            }

            (async function() {
                const rates = await getExchangeRates();
                sendResponse(rates);
            })();
            
            return true;
        }
    });
})();
