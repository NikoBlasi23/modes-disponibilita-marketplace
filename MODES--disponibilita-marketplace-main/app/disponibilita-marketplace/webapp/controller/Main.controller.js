sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    'sap/ui/model/FilterOperator',
    'sap/ui/model/Filter',
    'sap/ui/export/Spreadsheet',
    'sap/ui/export/library',
    "../utils/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageBox, FilterOperator, Filter, Spreadsheet, exportLibrary, formatter) {
        "use strict";

        var EdmType = exportLibrary.EdmType;

        return Controller.extend("disponibilitamarketplace.controller.Main", {
            formatter: formatter,
            onInit: async function () {

                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteMain").attachPatternMatched(this.openDialogChannelSelect, this);

                var oModel = new sap.ui.model.json.JSONModel();
                var sData = {};
                oModel.setData(sData);
                this.getView().setModel(oModel, "sFilter");

                const oFilterModel = new JSONModel({
                    filters: {
                        IP_CANALE: "",
                        IP_SKU: "",
                        IP_BRAND_ID: "",
                        IP_GENDER: "",
                        IP_SUBGENDER: "",
                        IP_FAMILY: "",
                        IP_PRODUCT_GRP: "",
                        IP_SEASON: "",
                        IP_COLLECTION: "",
                        IP_FARFETCH_ID: "",
                        IP_SKU_PARENT: ""
                    }
                });
                this.getView().setModel(oFilterModel, "filtriModel")

                var puntiVenditaFilter = new Filter({
                    filters: [
                        new Filter({
                            path: 'CHANNEL_ID',
                            operator: FilterOperator.NE,
                            value1: 'PDVCH'
                        }),
                        new Filter({
                            path: 'CHANNEL_ID',
                            operator: FilterOperator.NE,
                            value1: 'PDVFR'
                        }), new Filter({
                            path: 'CHANNEL_ID',
                            operator: FilterOperator.NE,
                            value1: 'PDVIT'
                        })
                    ],
                    and: true
                })

                var oData = new sap.ui.model.json.JSONModel();
                var aData = await this._getHanaDataChannel("/ANAGRAFICA_SALES_CHANNELS", puntiVenditaFilter);
                oData.setData(aData);
                this.getView().setModel(oData, "channelModel");
                console.log(aData)
            },

            _getHanaDataChannel: function (Entity, Filters) {
                const xsoDataModelReport = this.getOwnerComponent().getModel("protectionRules");
                return new Promise(function (resolve, reject) {
                    xsoDataModelReport.read(Entity, {
                        filters: [Filters],
                        success: function (oDataIn) {
                            resolve(oDataIn.results);
                        },
                        error: function (error) {
                            reject(console.log(error));
                        },
                    });
                });
            },

            openDialogChannelSelect: function () {


                if (!this.pDialog) {
                    this.pDialog = this.loadFragment({
                        name: "disponibilitamarketplace.view.fragments.channelFilter"
                    });
                }

                const oView = this.getView();

                this.pDialog.then(function (oDialog) {
                    oDialog.setModel(oView.getModel("filtriModel"), "modelDialog");
                    oDialog.open();
                })
            },
            channelFilterSearch: function (oEvent) {

                if (!this.byId("selectedChannel").getValue()) {
                    MessageBox.information("Inserire un canale");
                    return
                }

                const { IP_CANALE } = this.getView().getModel("filtriModel").getProperty("/filters");
                let oTempModel = this.getView().getModel("temp");
                let oModel = this.getView().getModel();
                let selectedChannel = this.getView().byId("selectedChannel").getSelectedItem().getText();
                this.byId("inputCanale").setValue(selectedChannel)
                sap.ui.core.BusyIndicator.show(0)
                var filtersGrp = [];
                filtersGrp.push(new Filter([
                    new Filter("PRODUCT_GRP", FilterOperator.NE, 'Packaging'),
                    new Filter("PRODUCT_GRP", FilterOperator.NE, 'merci no core')
                ], true));


                oModel.read("/DisponibilitaMarketplace(IP_CANALE='" + IP_CANALE + "',IP_SKU='ALL',IP_BRAND_ID='ALL',IP_GENDER='ALL',IP_SUBGENDER='ALL',IP_FAMILY='ALL',IP_PRODUCT_GRP='ALL',IP_SEASON='ALL',IP_COLLECTION='ALL',IP_FARFETCH_ID='ALL')/Set", {
                    filters: filtersGrp,
                    success: function (data) {
                        oTempModel.setProperty("/disponibilitaMarketplace", data.results);
                        
                        this.getView().byId("skuParentsInput").setValue(0)
                        this.getView().byId("quantityInput").setValue(0)
                        this.getView().byId("wholesaleInput").setValue("0,00 €")
                        this.getView().byId("wholesalePounds").setValue("0,00 GBP")
                        this.getView().byId("wholesaleFrancs").setValue("0,00 CHF")

                        this.getView().byId("retailInput").setValue("0,00 €")
                        this.getView().byId("retailInputPounds").setValue("0,00 GBP")
                        this.getView().byId("retailInputFrancs").setValue("0,00 CHF")

                        this.createFilter(data.results)
                        console.log(data.results)
                        sap.ui.core.BusyIndicator.hide()
                        this.resetFilters()
                        this.byId("channelFilterDialog").close();
                    }.bind(this),
                    error: err => {
                        console.log(err);
                    }

                });
            },
            onClear: function () {
                console.log("Cleared")
            },

            resetFilters: function () {
                //Reset dei filtri all'utilizzo della selezione del canale/cambio del canale

                this.byId("multiSku").setSelectedKeys();
                this.byId("multiBrand").setSelectedKeys();
                this.byId("multiCollection").setSelectedKeys();
                this.byId("multiSeason").setSelectedKeys();
                this.byId("multiGender").setSelectedKeys();
                this.byId("multiSubGender").setSelectedKeys();
                this.byId("multiFamilyGroup").setSelectedKeys();
                this.byId("multiProductGroup").setSelectedKeys();
                this.byId("multiFFID").setSelectedKeys();
                this.byId("multiSKUPARENTGroup").setSelectedKeys();

                var smartFilterBar = this.byId("smartFilterBar");
                smartFilterBar.clear();
            },
            createFilter: function (data) {
                let oTempModel = this.getView().getModel("temp");
                oTempModel.setSizeLimit(1000)
                let sku_parent = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].SKU_PARENT != "" && data[i].SKU_PARENT != null) {
                            sku_parent.push(data[i].SKU_PARENT)
                        }
                    }
                }
                if (sku_parent.length > 0) {
                    let skuparentuniq = [...new Set(sku_parent)];
                    let locations = [];
                    for (var i = 0; i < skuparentuniq.length; i++) {
                        locations.push({
                            SKU_PARENT: skuparentuniq[i]
                        })
                    }

                    oTempModel.setProperty("/Filtersku_parent_uniqe", locations);
                    this.getView().byId("skuParentsInput").setValue(oTempModel.getData().Filtersku_parent_uniqe.length)

                    var numArticoli = this.getView().getModel("temp").getData().disponibilitaMarketplace.length
                    var quantity = 0
                    var wholesaleEur = 0
                    var retailEur = 0
                    var wholesaleChf = 0
                    var retailChf = 0
                    var wholesaleGbp = 0
                    var retailGbp = 0
                    for (let i = 0; i < numArticoli; i++) {
                        quantity = quantity + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].QUANTITY)
                        if(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].VALUTA === "EUR") {
                            wholesaleEur = wholesaleEur + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_WHOLESALE)
                            retailEur = retailEur + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_RETAIL)
                        } else if(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].VALUTA === "EUR") {
                            wholesaleEur = wholesaleEur + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_WHOLESALE)
                            retailEur = retailEur + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_RETAIL)
                        } else if(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].VALUTA === "CHF") {
                            wholesaleChf = wholesaleChf + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_WHOLESALE)
                            retailChf = retailChf + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_RETAIL)
                        } else if(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].VALUTA === "GBP") {
                            wholesaleGbp = wholesaleGbp + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_WHOLESALE)
                            retailGbp = retailGbp + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_RETAIL)
                        }
                    }
                    let euro = Intl.NumberFormat('it-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        useGrouping: 'false'
                    });
                    let pounds = Intl.NumberFormat('it-DE', {
                        style: 'currency',
                        currency: 'GBP',
                    });
                    let francs = Intl.NumberFormat('it-DE', {
                        style: 'currency',
                        currency: 'CHF',
                    });

                    this.getView().byId("quantityInput").setValue(quantity)
                    this.getView().byId("wholesaleInput").setValue(`${euro.format(wholesaleEur)}`)
                    this.getView().byId("wholesalePounds").setValue(`${pounds.format(wholesaleGbp)}`)
                    this.getView().byId("wholesaleFrancs").setValue(`${francs.format(wholesaleChf)}`)

                    this.getView().byId("retailInput").setValue(`${euro.format(retailEur)}`)
                    this.getView().byId("retailInputPounds").setValue(`${pounds.format(retailGbp)}`)
                    this.getView().byId("retailInputFrancs").setValue(`${francs.format(retailChf)}`)
                    
                }
                let brand = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].BRAND != "" && data[i].BRAND != null) {
                            brand.push(data[i].BRAND)
                        }
                    }
                }
                if (brand.length > 0) {
                    let brandUniq = [...new Set(brand)];
                    let locations = [];
                    for (var i = 0; i < brandUniq.length; i++) {
                        locations.push({
                            BRAND: brandUniq[i]
                        })
                    }

                    oTempModel.setProperty("/FilterBrandUniq", locations);
                }

                let season = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].SEASON != "" && data[i].SEASON != null) {
                            season.push(data[i].SEASON)
                        }
                    }
                }
                if (season.length > 0) {
                    let seasonUniq = [...new Set(season)];
                    let locations = [];
                    for (var i = 0; i < seasonUniq.length; i++) {
                        locations.push({
                            SEASON: seasonUniq[i]
                        })
                    }
                    oTempModel.setProperty("/FilterSeasonUniq", locations);
                }

                let gender = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].GENDER != "" && data[i].GENDER != null) {
                            gender.push(data[i].GENDER)
                        }
                    }
                }
                if (gender.length > 0) {
                    let genderUniq = [...new Set(gender)];
                    let locations = [];
                    for (var i = 0; i < genderUniq.length; i++) {
                        locations.push({
                            GENDER: genderUniq[i]
                        })
                    }
                    oTempModel.setProperty("/FilterGenderUniq", locations);
                }

                let subgender = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].SUBGENDER != "" && data[i].SUBGENDER != null) {
                            subgender.push(data[i].SUBGENDER)
                        }
                    }
                }
                if (subgender.length > 0) {
                    let subgenderUniq = [...new Set(subgender)];
                    let locations = [];
                    for (var i = 0; i < subgenderUniq.length; i++) {
                        locations.push({
                            SUBGENDER: subgenderUniq[i]
                        })
                    }
                    oTempModel.setProperty("/FilterSubGenderUniq", locations);
                }

                let familygrp = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].FAMILY_GRP != "" && data[i].FAMILY_GRP != null) {
                            familygrp.push(data[i].FAMILY_GRP)
                        }
                    }
                }
                if (familygrp.length > 0) {
                    let familygrpUniq = [...new Set(familygrp)];
                    let locations = [];
                    for (var i = 0; i < familygrpUniq.length; i++) {
                        locations.push({
                            FAMILY_GRP: familygrpUniq[i]
                        })
                    }
                    oTempModel.setProperty("/FilterFamGrpUniq", locations);
                }

                let productgrp = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].PRODUCT_GRP != "" && data[i].PRODUCT_GRP != null) {
                            productgrp.push(data[i].PRODUCT_GRP)
                        }
                    }
                }
                if (productgrp.length > 0) {
                    let productgrpUniq = [...new Set(productgrp)];
                    let locations = [];
                    for (var i = 0; i < productgrpUniq.length; i++) {
                        locations.push({
                            PRODUCT_GRP: productgrpUniq[i]
                        })
                    }

                    oTempModel.setProperty("/FilterProdGrpUniq", locations);
                }

                let collection = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].COLLECTION != "" && data[i].COLLECTION != null) {
                            collection.push(data[i].COLLECTION)
                        }
                    }
                }
                if (collection.length > 0) {
                    let collectionUniq = [...new Set(collection)];
                    let locations = [];
                    for (var i = 0; i < collectionUniq.length; i++) {
                        locations.push({
                            COLLECTION: collectionUniq[i]
                        })
                    }
                    oTempModel.setProperty("/FilterCollectionUniq", locations);
                }
                let farFetch = [];
                if (data.length > 0) {
                    for (var i = 0; i < data.length; i++) {
                        if (data[i].FARFETCH_ID != "" && data[i].FARFETCH_ID != null) {
                            farFetch.push(data[i].FARFETCH_ID)
                        }
                    }
                }
                if (farFetch.length > 0) {
                    let farFetchUniq = [...new Set(farFetch)];
                    let locations = [];
                    locations.push({
                        FARFETCH_ID: ""
                    })
                    for (var i = 0; i < farFetchUniq.length; i++) {
                        locations.push({
                            FARFETCH_ID: farFetchUniq[i]
                        })
                    }

                    oTempModel.setProperty("/FilterfarFetchUniq", locations);
                }

                var oSorterBrand = new sap.ui.model.Sorter("BRAND", false);
                this.getView().byId("multiBrand").getBinding("items").sort(oSorterBrand)

            },

            multiFilterText: function (aArray, vName) {

                var aFilter = [];
                if (aArray.length === 0) {
                    return new Filter(vName, FilterOperator.EQ, "");
                } else if (aArray.length === 1) {
                    return new Filter(vName, FilterOperator.EQ, aArray[0]);
                } else {
                    for (var i = 0; i < aArray.length; i++) {
                        aFilter.push(new Filter(vName, FilterOperator.EQ, aArray[i]));
                    }
                    return aFilter;
                }
            }
            ,
            onSearch: function () {

                sap.ui.core.BusyIndicator.show(0)
                let sFilter = this.getView().getModel("sFilter").getData();
                let aFilters = [];

                if (sFilter.SEASON !== null && sFilter.SEASON !== undefined && sFilter.SEASON !== '') {
                    if (sFilter.SEASON.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.SEASON, "SEASON");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.COLLECTION !== null && sFilter.COLLECTION !== undefined && sFilter.COLLECTION !== '') {
                    if (sFilter.COLLECTION.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.COLLECTION, "COLLECTION");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.BRAND !== null && sFilter.BRAND !== undefined && sFilter.BRAND !== '') {
                    if (sFilter.BRAND.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.BRAND, "BRAND");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.GENDER !== null && sFilter.GENDER !== undefined && sFilter.GENDER !== '') {
                    if (sFilter.GENDER.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.GENDER, "GENDER");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.SUBGENDER !== null && sFilter.SUBGENDER !== undefined && sFilter.SUBGENDER !== '') {
                    if (sFilter.SUBGENDER.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.SUBGENDER, "SUBGENDER");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.FAMILY_GRP !== null && sFilter.FAMILY_GRP !== undefined && sFilter.FAMILY_GRP !== '') {
                    if (sFilter.FAMILY_GRP.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.FAMILY_GRP, "FAMILY_GRP");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.PRODUCT_GRP !== null && sFilter.PRODUCT_GRP !== undefined && sFilter.PRODUCT_GRP !== '') {
                    if (sFilter.PRODUCT_GRP.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.PRODUCT_GRP, "PRODUCT_GRP");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.SKUS !== null && sFilter.SKUS !== undefined && sFilter.SKUS !== '') {
                    if (sFilter.SKUS.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.SKUS, "SKUS");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }

                if (sFilter.SKUS !== null && sFilter.FARFETCH_ID !== undefined && sFilter.FARFETCH_ID !== '') {
                    if (sFilter.FARFETCH_ID.length !== 0) {
                        let aFilterTemp = this.multiFilterText(sFilter.FARFETCH_ID, "FARFETCH_ID");
                        aFilters = aFilters.concat(aFilterTemp);
                    }
                }


                const { IP_CANALE } = this.getView().getModel("filtriModel").getProperty("/filters");
                let oTempModel = this.getView().getModel("temp");
                let oModel = this.getView().getModel();
                oModel.read("/DisponibilitaMarketplace(IP_CANALE='" + IP_CANALE + "',IP_SKU='ALL',IP_BRAND_ID='ALL',IP_GENDER='ALL',IP_SUBGENDER='ALL',IP_FAMILY='ALL',IP_PRODUCT_GRP='ALL',IP_SEASON='ALL',IP_COLLECTION='ALL',IP_FARFETCH_ID='ALL')/Set", {
                    filters: aFilters,
                    success: function (data) {
                        this.createFilter(data.results)
                        oTempModel.setProperty("/disponibilitaMarketplace", data.results);

                        var numArticoli = this.getView().getModel("temp").getData().disponibilitaMarketplace.length
                        var quantity = 0
                        var wholesale = 0
                        var retail = 0
                        for (let i = 0; i < numArticoli; i++) {
                            quantity = quantity + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].QUANTITY)
                            wholesale = wholesale + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_WHOLESALE)
                            retail = retail + Number(this.getView().getModel("temp").getData().disponibilitaMarketplace[i].TOT_VALUE_RETAIL)
                        }
                        
                        sap.ui.core.BusyIndicator.hide()
                    }.bind(this),
                    error: err => {
                        console.log(err);
                    }
                });
            },
            createColumnConfig: function () {

                let aCols = [];

                aCols.push({
                    label: 'Channel',
                    property: 'CANALE',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Sku Parent',
                    property: 'SKU_PARENT',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Sku',
                    property: 'SKUS',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'FFID (Farfetch ID)',
                    property: 'FARFETCH_ID',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Sku Description',
                    property: 'SKU_DESCRIPTION',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Photo',
                    property: 'SKU_IMAGE',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Season',
                    property: 'SEASON',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Brand',
                    property: 'BRAND',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Gender',
                    property: 'GENDER',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Subgender',
                    property: 'SUBGENDER',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Family Group',
                    property: 'FAMILY_GRP',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Product Group',
                    property: 'PRODUCT_GRP',
                    type: EdmType.String
                });
                aCols.push({
                    label: 'Value Wholesale',
                    property: 'VALUE_WHOLESALE',
                    type: EdmType.Currency,
                    scale: 2,
                    unitProperty: "VALUTA"
                });
                aCols.push({
                    label: 'Value Retail',
                    property: 'VALUE_RETAIL',
                    type: EdmType.Currency,
                    scale: 2,
                    unitProperty: "VALUTA"
                });
                aCols.push({
                    label: 'Quantity',
                    property: 'QUANTITY',
                    type: EdmType.Number,
                    scale: 0
                });
                aCols.push({
                    label: 'Tot. Value Wholesale',
                    property: 'TOT_VALUE_WHOLESALE',
                    type: EdmType.Currency,
                    scale: 2,
                    unitProperty: "VALUTA"
                    

                });
                aCols.push({
                    label: 'Tot. Value Retail',
                    property: 'TOT_VALUE_RETAIL',
                    type: EdmType.Currency,
                    scale: 2,
                    unitProperty: "VALUTA"
                });
                aCols.push({
                    label: 'Valuta',
                    property: 'VALUTA',
                    type: EdmType.Currency
                });
                aCols.push({
                    label: 'SKU Parents',
                    property: 'SKU_PARENTS_TOT',
                    type: EdmType.Number,
                    scale: 0
                });
                aCols.push({
                    label: 'Quantità',
                    property: 'Quantita',
                    type: EdmType.Number,
                    scale: 0
                });
                aCols.push({
                    label: 'Total Value Retail',
                    property: 'VALUE_RETAIL_TOT',
                    scale: 2,
                    unitProperty: "VALUTA"
                    
                });
                aCols.push({
                    label: 'Total Value Wholesale',
                    property: 'VALUE_WHOLESALE_TOT',
                    scale: 2,
                    unitProperty: "VALUTA"
                    
                });
                // aCols.push({
                //     label: 'Total Value Wholesale (Sterline)',
                //     property: 'VALUE_WHOLESALE_TOT_P',
                //     type: EdmType.Currency,
                //     scale: 2,
                //     unitProperty: "VALUTA"
                    
                // });
                // aCols.push({
                //     label: 'Total Value Wholesale (Franchi)',
                //     property: 'VALUE_WHOLESALE_TOT_C',
                //     type: EdmType.Currency,
                //     scale: 2,
                //     unitProperty: "VALUTA"
                    
                // });





                // aCols.push({
                //     label: 'Total Value Wholesale (Sterline)',
                //     property: 'VALUE_WHOLESALE_TOT_P',
                //     type: EdmType.Currency,
                //     scale: 2,
                //     unitProperty: "VALUTA"
                    
                // });
                // aCols.push({
                //     label: 'Total Value Wholesale (Franchi)',
                //     property: 'VALUE_WHOLESALE_TOT_C',
                //     type: EdmType.Currency,
                //     scale: 2,
                //     unitProperty: "VALUTA"
                    
                // });

                return aCols;
            },

            onExportExcel: function () {
                let aCols, oRowBinding, oSettings, oSheet, oTable;
                if (!this._oTable) {
                    this._oTable = this.byId("smartTable");
                }
                oTable = this._oTable;
                oRowBinding = oTable.getBinding("items");
                aCols = this.createColumnConfig();
                oSettings = {
                    workbook: {
                        columns: aCols,
                        hierarchyLevel: 'Level'
                    },
                    dataSource: oRowBinding,
                    fileName: "Excel Disponibilità Marketplace",
                    worker: false
                };
                oSheet = new Spreadsheet(oSettings);
                // for (var i = 0; i < oSheet._mSettings.dataSource.data.length; i++) {
                //     oSheet._mSettings.dataSource.data[i].TOT_VALUE_RETAIL = oSheet._mSettings.dataSource.data[i].TOT_VALUE_RETAIL + "€"
                //     oSheet._mSettings.dataSource.data[i].TOT_VALUE_WHOLESALE = oSheet._mSettings.dataSource.data[i].TOT_VALUE_WHOLESALE + "€"
                //     oSheet._mSettings.dataSource.data[i].VALUE_RETAIL = oSheet._mSettings.dataSource.data[i].VALUE_RETAIL + "€"
                //     oSheet._mSettings.dataSource.data[i].VALUE_WHOLESALE = oSheet._mSettings.dataSource.data[i].VALUE_WHOLESALE + "€"

                // }

                oSheet._mSettings.dataSource.data[0].Quantita = this.getView().byId("quantityInput").getValue()


                oSheet._mSettings.dataSource.data[0].VALUE_WHOLESALE_TOT = this.getView().byId("wholesaleInput").getValue()
                //oSheet._mSettings.dataSource.data[2].VALUE_WHOLESALE_TOT = this.getView().byId("wholesalePounds").getValue() 
                oSheet._mSettings.dataSource.data[1].VALUE_WHOLESALE_TOT = this.getView().byId("wholesaleFrancs").getValue() 
                // oSheet._mSettings.dataSource.data[0].VALUE_WHOLESALE_TOT_P = this.getView().byId("wholesalePounds").getValue() 
                // oSheet._mSettings.dataSource.data[0].VALUE_WHOLESALE_TOT_C = this.getView().byId("wholesaleFrancs").getValue() 
                
               
                oSheet._mSettings.dataSource.data[0].VALUE_RETAIL_TOT = this.getView().byId("retailInput").getValue()
                //oSheet._mSettings.dataSource.data[2].VALUE_RETAIL_TOT = this.getView().byId("retailInputPounds").getValue() 
                oSheet._mSettings.dataSource.data[1].VALUE_RETAIL_TOT = this.getView().byId("retailInputFrancs").getValue() 
                // oSheet._mSettings.dataSource.data[0].VALUE_RETAIL_TOT_P = this.getView().byId("retailInputPounds").getValue() 
                // oSheet._mSettings.dataSource.data[0].VALUE_RETAIL_TOT_C = this.getView().byId("retailInputFrancs").getValue() 



                oSheet._mSettings.dataSource.data[0].SKU_PARENTS_TOT = this.getView().byId("skuParentsInput").getValue()
                oSheet.build().finally(function () {
                    oSheet.destroy();
                })
            }
        });
    });
