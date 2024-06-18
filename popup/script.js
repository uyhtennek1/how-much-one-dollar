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
    'cad': {
        name: 'Canadian dollar',
        code: 'CAD',
        symbol: '$',
        issuedBy: 'Canada',
        issuedBy_code: 'ca',
        issuedBy_flag: getFlagUrl('ca')
    },
    'cny': {
        name: 'Renminbi',
        code: 'CNY',
        symbol: '¥',
        issuedBy: 'China',
        issuedBy_code: 'cn',
        issuedBy_flag: getFlagUrl('cn')
    },
    'eur': {
        name: 'Euro',
        code: 'EUR',
        symbol: '€',
        issuedBy: 'European Union',
        issuedBy_code: 'eu',
        issuedBy_flag: getFlagUrl('european_union')
    },
    'gbp':{
        name: 'Pound',
        code: 'GBP',
        symbol: '£',
        issuedBy: 'Great Britain',
        issuedBy_code: 'gb',
        issuedBy_flag: getFlagUrl('gb')
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

function createCurrencyListItem(currencyCode, amount, index) {
    const $item = $foreignCurrencyPrefab.cloneNode(true);
    const $itemFlag = $item.querySelector('img.currency-icon');
    const $itemCode = $item.querySelector('span.currency-name');
    const $itemAmount = $item.querySelector('span.currency-amount');
    const $reverseBtn = $item.querySelector('svg.lucide-arrow-up-down');
    const $raiseTopBtn = $item.querySelector('svg.lucide-list-start');
    const $deleteCurrency = $item.querySelector('svg.lucide-trash-2')

    const currencyInfo = CURRENCIES[currencyCode];

    $itemFlag.src = currencyInfo.issuedBy_flag;
    $itemCode.textContent = currencyInfo.code;
    $itemAmount.textContent = currencyInfo.symbol + amount;

    $raiseTopBtn.addEventListener('click', function (){
        $foreignCurrencyList.removeChild($item)
        $foreignCurrencyList.insertBefore( $item, $foreignCurrencyList.firstChild)
    });

    $deleteCurrency.addEventListener('click', function (){
        $foreignCurrencyList.removeChild($item)
        // $foreignCurrencyList.insertBefore( $item, $foreignCurrencyList.firstChild)
    });

    const $Edit = document.querySelector('#Edit');
    $Edit.addEventListener('click',function(){
        if($reverseBtn.classList.contains('hidden')){
            $reverseBtn.classList.remove('hidden');
            $raiseTopBtn.classList.remove('hidden');
            $deleteCurrency.classList.remove('hidden');
        }else{
            $reverseBtn.classList.add('hidden');
            $raiseTopBtn.classList.add('hidden');
            $deleteCurrency.classList.add('hidden');
        };    
    });

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

        const $sun =  document.querySelector('#sun');
        const $moon = document.querySelector('#moon');
        $sun.addEventListener('click', function (){
            $sun.classList.add('hidden');
            $moon.classList.remove('hidden');
        });
        $moon.addEventListener('click', function (){
            $sun.classList.remove('hidden');
            $moon.classList.add('hidden');
        });

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

        // hide edit options


        // End
        $baseCurrencyAmountInput.select();
    };

    const updateCurrencyList = (foreignCurrencies) => {
        console.log(foreignCurrencies);
        $foreignCurrencyList.replaceChildren(
            ...Object.keys(foreignCurrencies).map((x, i) => createCurrencyListItem(
                x,
                formatCurrency($baseCurrencyAmountInput.value * foreignCurrencies[x]),
                i
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

function onToTheTopClicked() {
    alert("hi");
}

// daniel
function switchToLightMode() {
    document.getElementById('sun').classList.add('hidden');
    document.getElementById('moon').classList.remove('hidden');
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
}
function switchToDarkMode() {
    document.getElementById('sun').classList.remove('hidden');
    document.getElementById('moon').classList.add('hidden');
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
}
window.addEventListener('load', function() {
    const $sun = document.getElementById('sun');
    const $moon = document.getElementById('moon');
    $sun.addEventListener('click', switchToLightMode);
    $moon.addEventListener('click', switchToDarkMode);
});