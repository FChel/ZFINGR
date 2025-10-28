sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/FormattedText",
	"./model/models",
	"./controller/ErrorHandler"
	], function (UIComponent, Device, JSONModel, MessageBox, FormattedText, models, ErrorHandler) {
	"use strict";

	return UIComponent.extend("defence.finance.finux.gr.Component", {

		metadata : {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * In this method, the device models are set and the router is initialized.
		 * @public
		 * @override
		 */
		init : function () {
			UIComponent.prototype.init.apply(this, arguments);

			// initialize the error handler with the component
			this._oErrorHandler = new ErrorHandler(this);

			// set the device model
			var oDeviceModel = models.createDeviceModel();
			this.setModel(oDeviceModel, "device");

			// create the views based on the url/hash
			this.getRouter().initialize();

			// metadata failed
			this.metadataFailed().then(function() {
				var sText = this.getModel("i18n").getResourceBundle().getText("accessErrorText");
				MessageBox.error(new FormattedText("", { htmlText: sText }), {
					title: this.getModel("i18n").getResourceBundle().getText("accessErrorTitle"),
					initialFocus: null,
					onClose: function(sAction) {
						history.go(-1);
					}
				});
			}.bind(this));

			// in FLP (FIORI launchpad)
			var bInFLP = false;
			if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
				bInFLP = true;
			} else {
				// load user details (only if not in FLP)
				this.getModel().metadataLoaded().then(function () {
					this.loadUserDetails();
				}.bind(this));
			}

			// component Model
			var oComponentModel = new JSONModel({
				inFLP: bInFLP
			});
			this.setModel(oComponentModel, "componentModel");
		},

		/**
		 * return metadataFailed promise (workaround because there isn't a standard one)
		 */
		metadataFailed : function() {
			var oModel = this.getModel();
			if (oModel.isMetadataLoadingFailed()) {
				return Promise.resolve();
			} else {
				return new Promise(function(resolve) {
					oModel.attachEventOnce("metadataFailed", resolve);
				});
			}
		},

		/**
		 * 
		 */
		loadUserDetails : function() {
			var oModel = this.getModel();
			var oController = this;

			oModel.read("/UserDetails", {
				success: function(oData) {
					var oUserModel = new JSONModel();
					if (oData.results) {
						var oUser = oData.results[0];
						oUserModel.setData(oUser);
					}
					oController.setModel(oUserModel, "userModel");
				}            
			});
		},

		/**
		 * The component is destroyed by UI5 automatically.
		 * In this method, the ErrorHandler is destroyed.
		 * @public
		 * @override
		 */
		destroy : function () {
			this._oErrorHandler.destroy();
			// call the base component's destroy function
			UIComponent.prototype.destroy.apply(this, arguments);
		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass : function() {
			if (this._sContentDensityClass === undefined) {
				// check whether FLP has already set the content density class; do nothing in this case
				// eslint-disable-next-line sap-no-proprietary-browser-api
				if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
					this._sContentDensityClass = "";
				} else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		}

	});

});