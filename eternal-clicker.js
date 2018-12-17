// ==UserScript==
// @name         Eternal Chest Clicker
// @namespace    https://github.com/developingedan/eternal-clicker
// @downloadURL  https://raw.githubusercontent.com/developingedan/eternal-clicker/master/eternal-clicker.js
// @updateURL    https://raw.githubusercontent.com/developingedan/eternal-clicker/master/eternal-clicker.js
// @version      1.2
// @description  click on twitch stream active chests
// @author       You
// @match        https://0qr7fa6llzn4txgnfgb8ipeksd5v24.ext-twitch.tv/0qr7fa6llzn4txgnfgb8ipeksd5v24/1.5.11/8d945d43853061fa529ab8df6ed6683d/viewer.html?*
// @grant        none
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// sample url: https://0qr7fa6llzn4txgnfgb8ipeksd5v24.ext-twitch.tv/0qr7fa6llzn4txgnfgb8ipeksd5v24/1.5.11/8d945d43853061fa529ab8df6ed6683d/viewer.html?anchor=video_overlay&amp;language=en&amp;mode=viewer&amp;state=released&amp;platform=web
// ==/UserScript==
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

(function() {
    'use strict';

     var options = {
      // The script will loop on a random basis between intervalMin and intervalMax milliseconds
      intervalMin: 2000,
      intervalMax: 4500,
      // Interval to re-check for silver
      silverIntervalMin: 2000,
      silverIntervalMax: 3000,
      // Targeted chest 'miss' rate, script will keep the rate of missed chests close to this value. The more reomved it gets from this value, the more likely a miss occurs
      missRate: .15,
      // How many runs before a heartbeat log is displayed, 0 to turn off heartbeat logging
      passesUntilLog: 1000,
      // Class used in the waystone overlay to denote the bronze idle animation
      bronzeIdleClass: 'bronzeIdle',
      // Class used in the waystone overlay to denote the silver idle animation
      silverIdleClass: 'silverIdle',
      // Class used in the waystone overlay to denote a hidden animation
      hideClass: 'dropHide',
      // If a chest is purposefully missed, multiply the next interval by this amount to be sure the chest disappears (you want missMultipler * intervalMax > 20 000)
      missMultiplier: 20,
      // data element for how much chest was worth
      attrCurrency: 'data-currencygranted',
      // How many times to check for silver
      silverTimes: 5,
      // Max amount that a bronze chest is worth
      bronzeCutoff: 280,
      // Debug mode boolean
      debug: false
    };
    var bronzeCount = 0;
    var totalCount = 0;
    var silverCount = 0;
    var bronzeList = document.getElementsByClassName(options.bronzeIdleClass) ;
    var bronze = bronzeList[0];
    var silverList = document.getElementsByClassName(options.silverIdleClass);
    var silver = silverList[0];
    var passes = 0;
    var intervalTotal = 0;
    var currencyTotal = 0;
    var localStore = false;
    if (typeof(Storage) !== "undefined") {
        localStore = true;
        console.log("ECC: Using local storage");
    }

    console.log("ECC: Running Eternal Chest Clicker");

    var iterate = function () {
        var missed = false;
        try {
            if (bronze) {
                if (!bronze.classList.contains(options.hideClass)) {
                    var missPercent = 1 - getBronzeCount() / incrementTotalCount(1);
                    var calcMissRate = options.missRate;
                    var randNum = Math.random();
                    if (missPercent < options.missRate) {
                        // If this is the beginning of a run, linearally increment the calculated rate
                        if (missPercent == 0) {
                            calcMissRate = options.missRate * getTotalCount();
                        }
                        // Otherwise, make the rate increase based on deviation from desired missRate
                        else {
                            calcMissRate = options.missRate + Math.abs(1-(Math.log(missPercent) / Math.log(options.missRate)));
                        }
                    }
                    else {
                        calcMissRate = calcMissRate / 4;
                    }
                    if (randNum <= calcMissRate) {
                        missed = true;
                        console.log(format("ECC: Miss processed with a calculated miss rate of {0}%. Rolled {1}.",
                                           calcMissRate, randNum));
                        console.log(format("ECC: Missed bronze {0}/{1}. I have clicked {2}% for a total of {3} influence. {4}",
                                           (getTotalCount() - getBronzeCount()), getTotalCount(), Math.round(getBronzeCount() / getTotalCount() * 100), getCurrencyTotal(), new Date().getTime()));
                        return;
                    }
                    else if (randNum > calcMissRate) {
                        console.log(format("ECC: Miss avoided with a calculated miss rate of {0}%. Rolled {1}. {2}",
                                           calcMissRate, randNum, new Date().getTime()));
                    }
                    triggerMouseEvent(bronze, 'mousedown');
                    triggerMouseEvent(bronze, 'click');
                    triggerMouseEvent(bronze, 'mouseup');
                    if (options.debug) {
                        bronze.setAttribute('class', bronze.getAttribute('class') + ' ' + options.hideClass);
                        silver.setAttribute('class', silver.getAttribute('class').replace(' ' + options.hideClass, ''));
                    }
                    var chestTotal = parseInt(bronze.getAttribute(options.attrCurrency));
                    incrementCurrencyTotal(chestTotal);
                    console.log(format("ECC: Clicked bronze {0}/{1} for {2}. I have clicked {3}% for a total of {4} influence. {5}",
                                       incrementBronzeCount(1), getTotalCount(), chestTotal, Math.round(getBronzeCount() / getTotalCount() * 100), getCurrencyTotal(), new Date().getTime()));
                    // We know that silver is > 2xx points, and the total value is determined at the time you open the bronze
                    if (chestTotal > options.bronzeCutoff) {
                        checkForSilver();
                    }
                    return;
                }
            }
        }
        finally {
            var interval = generateInterval();
            // IF this is a purposeful miss, give time for the chest to time out
            if (missed) {
                interval *= options.missMultiplier;
                console.log(format("ECC: Adjusted interval to {0} for missing chest.", interval));
            }
            passes++;
            if (options.passesUntilLog > 0 && passes >= options.passesUntilLog) {
                console.log(format("ECC: Run {0} times over {1} milliseconds, for an average of {2}", options.passesUntilLog, intervalTotal, intervalTotal / passes));
                passes = 0;
                intervalTotal = 0;
            }
            intervalTotal += interval;
            setTimeout(iterate, interval);
        }
    };

    var checkForSilver = function () {
        var silverInterval = generateInterval(options.silverIntervalMin, options.silverIntervalMax);
        console.log(format("ECC: Looking for silver chest in {0} milliseconds", silverInterval));
        setTimeout(clickSilver, silverInterval, 0);
    };

    var format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
            : match
            ;
        });
    };

    var clickSilver = function (times) {
        if (!silver.classList.contains(options.hideClass)) {
            triggerMouseEvent(silver, 'mousedown');
            triggerMouseEvent(silver, 'click');
            triggerMouseEvent(silver, 'mouseup');
            console.log(format("ECC: Clicked silver chest {0}/{1}, for an upgrade rate of {2}%. {3}", incrementSilverCount(1), getBronzeCount(), Math.round(getSilverCount() / getBronzeCount() * 100), new Date().getTime()));
        }
        else if (++times < options.silverTimes) {
            checkForSilver();
        }
    };

    var generateInterval = function(min, max) {
        if (!min) {
            min = options.intervalMin;
        }
        if (!max) {
            max = options.intervalMax;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    };

    var triggerMouseEvent = function (node, eventType) {
        var clickEvent = document.createEvent('MouseEvents');
        clickEvent.initEvent (eventType, true, true);
        node.dispatchEvent (clickEvent);
    }

    var getSilverCount = function () {
        if (localStore) {
            if (!localStorage.silverCount) {
                localStorage.silverCount = 0;
            }
            return Number(localStorage.silverCount);
        }
        return silverCount;
    };
    var incrementSilverCount = function(val) {
        if (localStore) {
            localStorage.silverCount = getSilverCount() + val;
            return Number(localStorage.silverCount);
        }
        else {
            silverCount += val;
            return silverCount;
        }
    };

    var getBronzeCount = function() {
        if (localStore) {
            if (!localStorage.bronzeCount) {
                localStorage.bronzeCount = 0;
            }
            return Number(localStorage.bronzeCount);
        }
        return bronzeCount;
    };
    var incrementBronzeCount = function(val) {
        if (localStore) {
            localStorage.bronzeCount = getBronzeCount() + val;
            return Number(localStorage.bronzeCount);
        }
        else {
            bronzeCount += val;
            return bronzeCount;
        }
    };

    var getTotalCount = function () {
        if (localStore) {
            if (!localStorage.totalCount) {
                localStorage.totalCount = 0;
            }
            return Number(localStorage.totalCount);
        }
        return totalCount;
    };
    var incrementTotalCount = function(val) {
        if (localStore) {
            localStorage.totalCount = getTotalCount() + val;
            return Number(localStorage.totalCount);
        }
        else {
            totalCount += val;
            return totalCount;
        }
    };

    var getCurrencyTotal = function () {
        if (localStore) {
            if (!localStorage.currencyTotal) {
                localStorage.currencyTotal = 0;
            }
            return Number(localStorage.currencyTotal);
        }
        return currencyTotal;
    };
    var incrementCurrencyTotal = function(val) {
        if (localStore) {
            localStorage.currencyTotal = getCurrencyTotal() + val;
            return Number(localStorage.currencyTotal);
        }
        else {
            currencyTotal += val;
            return currencyTotal;
        }
    };

    var initialize = function () {
        if (localStore) {
            if (!localStorage.bronzeCount || isNaN(Number(localStorage.bronzeCount))) {
                localStorage.bronzeCount = 0;
            }
            if (!localStorage.silverCount || isNaN(Number(localStorage.silverCount))) {
                localStorage.silverCount = 0;
            }
            if (!localStorage.totalCount || isNaN(Number(localStorage.totalCount))) {
                localStorage.totalCount = 0;
            }
            if (!localStorage.currencyTotal || isNaN(Number(localStorage.currencyTotal))) {
                localStorage.currencyTotal = 0;
            }
        }
    };

    initialize();

    var loop = setTimeout(iterate, generateInterval());

})();