const getFlagUrl = code => `../node_modules/circle-flags/flags/${code}.svg`;

function formatCurrency(amount) {
    const formatter = new Intl.NumberFormat('en-HK');
    return formatter.format(amount);
}


const CURRENCIES = {
    'aud': {
        name: 'Australian dollar',
        code: 'AUD',
        symbol: '$',
        issuedBy: 'Australia',
        issuedBy_code: 'au',
        issuedBy_flag: getFlagUrl('au')
    },
    'cny': {
        name: 'Renminbi',
        code: 'CNY',
        symbol: '¥',
        issuedBy: 'China',
        issuedBy_code: 'cn',
        issuedBy_flag: getFlagUrl('cn')
    },
    'hkd': {
        name: 'Hong Kong dollar',
        code: 'HKD',
        symbol: '$',
        issuedBy: 'Hong Kong',
        issuedBy_code: 'hk',
        issuedBy_flag: getFlagUrl('hk')
    },
    'jpy': {
        name: 'Japanese yen',
        code: 'JPY',
        symbol: '¥',
        issuedBy: 'Japan',
        issuedBy_code: 'jp',
        issuedBy_flag: getFlagUrl('jp')
    },
    'twd': {
        name: 'New Taiwan dollar',
        code: 'TWD',
        symbol: 'NT$',
        issuedBy: 'Republic of China',
        issuedBy_code: 'tw',
        issuedBy_flag: getFlagUrl('tw')
    },
    'usd': {
        name: 'United States dollar',
        code: 'USD',
        symbol: '$',
        issuedBy: 'United States',
        issuedBy_code: 'us',
        issuedBy_flag: getFlagUrl('us')
    }
};

const $baseCurrencyBtn = document.querySelector('#dropdown-currency-button');
const $baseCurrencyFlag = $baseCurrencyBtn.querySelector('#base-currency-flag');
const $baseCurrencyName = $baseCurrencyBtn.querySelector('#base-currency-name');

const $baseCurrencySymbol = document.querySelector('label[for="currency-input"]');
const $baseCurrencyAmountInput = document.querySelector('#currency-input');

const $baseCurrencyDropdown = document.querySelector('#dropdown-currency');
const $baseCurrencyOptionPrefab = $baseCurrencyDropdown.querySelector('li');

const $foreignCurrencyList = document.querySelector('#foreign-currency-list');
const $foreignCurrencyPrefab = $foreignCurrencyList.querySelector('li.currency-exchanged');


// -------- DOM manipulations --------

function createBaseCurrencyOption(optVal, currency) {

    const $currencyOptionInstance = $baseCurrencyOptionPrefab.cloneNode(true);
    const $optionBtn = $currencyOptionInstance.querySelector('button');
    const $optionFlag = $currencyOptionInstance.querySelector('img');
    const $optionName = $currencyOptionInstance.querySelector('span');

    $optionBtn.value = optVal;
    $optionFlag.src = currency.issuedBy_flag;
    $optionFlag.alt = currency.issuedBy;
    $optionName.textContent = currency.code;

    $optionBtn.addEventListener('click', async () => {

        const getCurrentRatesTask = chrome.runtime.sendMessage({ greeting: 'get-current-rates' });
        const getOldCurrencyTask = chrome.runtime.sendMessage({ greeting: 'set-base-currency', currency: optVal });

        const { old_currency, new_currency } = await getOldCurrencyTask;
        const setCurrencyListTask = chrome.runtime.sendMessage({ greeting: 'replace-foreign-currency', with_currency: old_currency});
        const old_rates = await getCurrentRatesTask;

        appView.updateBaseCurrency(new_currency, old_currency, old_rates);

        const currencyRates = await setCurrencyListTask;
        appView.updateCurrencyList(currencyRates);
    });

    appView.baseCurrencyOptionElems[optVal] = $currencyOptionInstance;

    return $currencyOptionInstance;
}

function createCurrencyListItem(currencyCode, amount) {

    const $item = $foreignCurrencyPrefab.cloneNode(true);
    const $itemFlag = $item.querySelector('img.currency-icon');
    const $itemCode = $item.querySelector('span.currency-name');
    const $itemAmount = $item.querySelector('span.currency-amount');
    const $reverseBtn = $item.querySelector('svg.lucide-arrow-up-down');
    const $raiseTopBtn = $item.querySelector('svg.lucide-list-start');

    const currencyInfo = CURRENCIES[currencyCode];

    $itemFlag.src = currencyInfo.issuedBy_flag;
    $itemCode.textContent = currencyInfo.code;
    $itemAmount.textContent = currencyInfo.symbol + amount;

    return $item;
}


// -------- Code starts here --------

const appView = (function() {

    let baseCurrencyOptionElems = {};

    const init = async () => {
        const { base_currency, currency_rates, fetch_time, fetch_from, current_list } = await chrome.runtime.sendMessage({ greeting: 'list' });

        $baseCurrencyDropdown.replaceChildren(
            ...Object.keys(CURRENCIES).map(x => createBaseCurrencyOption(x, CURRENCIES[x]))
        );

        updateBaseCurrency(base_currency);
        updateCurrencyList(currency_rates);
    };

    const updateBaseCurrency = (newCurrencyCode, oldCurrencyCode, oldRates) => {

        const newCurrency = CURRENCIES[newCurrencyCode];

        // Hide and unhide options

        baseCurrencyOptionElems[newCurrencyCode].classList.add('hidden');
        if (oldCurrencyCode) {
            baseCurrencyOptionElems[oldCurrencyCode].classList.remove('hidden');
        }

        // Draw elements

        $baseCurrencyFlag.src = newCurrency.issuedBy_flag;
        $baseCurrencyFlag.alt = newCurrency.issuedBy;
        $baseCurrencyName.textContent = newCurrency.code;
        $baseCurrencySymbol.textContent = newCurrency.symbol;

        // Hide dropdown

        if (currencyDropdown)
            currencyDropdown.hide();

        // Update amount input

        if (oldRates && oldRates.hasOwnProperty(newCurrencyCode)) {
            const amountVal = $baseCurrencyAmountInput.value;
            $baseCurrencyAmountInput.value = formatCurrency(amountVal * oldRates[newCurrencyCode]);
        }
        else {
            $baseCurrencyAmountInput.value = 1;
        }

        // End
        $baseCurrencyAmountInput.select();
    };

    const updateCurrencyList = (foreignCurrencies) => {
        console.log(foreignCurrencies);
        $foreignCurrencyList.replaceChildren(
            ...Object.keys(foreignCurrencies).map(x => createCurrencyListItem(
                x,
                formatCurrency($baseCurrencyAmountInput.value * foreignCurrencies[x])
            ))
        );
    };

    return { baseCurrencyOptionElems, init, updateBaseCurrency, updateCurrencyList };
})();

let currencyDropdown;

lucide.createIcons();

window.addEventListener('load', function() {
    currencyDropdown = FlowbiteInstances.getInstance('Dropdown', 'dropdown-currency');
});

$baseCurrencyAmountInput.addEventListener('change', async () => {
    const { base_currency, currency_rates, fetch_time, fetch_from } = await chrome.runtime.sendMessage({ greeting: 'list' });
    appView.updateCurrencyList(currency_rates);
    $baseCurrencyAmountInput.blur();
});

(async function() {
    await appView.init();
})();
