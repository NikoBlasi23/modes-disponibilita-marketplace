sap.ui.define([

], function() {
    'use strict';
    return {
        formatpointToComma: function(date){
            if (date) {
                if (date == '0.000') {
                    return '';
                } else {
                    date = parseFloat(date).toFixed(2);
                    var StringToFrontEnd=date.replace(".", ",")
                    return StringToFrontEnd;
                }
            } else {
                return '';
            }
           
        },

        removedecimalZero: function(sValue) {
            if (sValue) {
                sValue = parseInt(sValue);
                sValue = sValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                if (sValue == '0') {
                    return '0';
                } else {
                    return sValue;
                }
            } else {
                return '0';
            }
        }
    }
}); 