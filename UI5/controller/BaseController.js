sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox"
], function (Controller, UIComponent, JSONModel, MessageBox) {
	"use strict";

	/**
	 * Base Controller for the Goods Receipt application.
	 * Provides common functionality for all controllers including routing,
	 * model management, messaging, navigation, and validation.
	 * 
	 * @namespace defence.finance.finux.gr.controller
	 */
	return Controller.extend("defence.finance.finux.gr.controller.BaseController", {

		/* =========================================================== */
		/* Core Framework Methods                                      */
		/* =========================================================== */

		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} The router for this component
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting a view model by name.
		 * @public
		 * @param {string} [sName] The model name
		 * @returns {sap.ui.model.Model} The model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting a view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel The model instance
		 * @param {string} sName The model name
		 * @returns {sap.ui.mvc.View} The view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} The resource model of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/* =========================================================== */
		/* User Interface Methods                                      */
		/* =========================================================== */

		/**
		 * Toggles the user information popover.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onToggleUserPopover: function (oEvent) {
			if (!this.oUserPopover) {
				this.oUserPopover = sap.ui.xmlfragment("defence.finance.finux.gr.view.UserPopover", this);
				this.getView().addDependent(this.oUserPopover);
			}

			if (this.oUserPopover.isOpen()) {
				this.oUserPopover.close();
			} else {
				this.oUserPopover.openBy(oEvent.getSource());
			}
		},

		/* =========================================================== */
		/* Message Management Methods                                  */
		/* =========================================================== */

		/**
		 * Registers the message manager and sets up the message model.
		 * @public
		 */
		registerMessageManager: function () {
			var oMessageManager = sap.ui.getCore().getMessageManager();
			this.setModel(oMessageManager.getMessageModel(), "message");
			oMessageManager.registerObject(this.getView(), true);
		},

		/**
		 * Gets or creates the message popover.
		 * @public
		 * @returns {sap.m.MessagePopover} The message popover instance
		 */
		getMessagePopover: function () {
			if (!this._oMessagePopover) {
				this._oMessagePopover = sap.ui.xmlfragment(
					this.getView().getId(),
					"defence.finance.finux.gr.view.MessagePopover",
					this
				);
				this.getView().addDependent(this._oMessagePopover);
			}
			return this._oMessagePopover;
		},

		/**
		 * Opens the message popover.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onMessagePopoverPress: function (oEvent) {
			this.getMessagePopover().openBy(oEvent.getSource());
		},

		/**
		 * Determines the button type based on message severity.
		 * Priority: Error > Warning > Success > Info
		 * @public
		 * @returns {string} The button type ("Reject", "Emphasized", "Accept", or "Ghost")
		 */
		getMessageButtonType: function () {
			var sHighestSeverity = "Ghost";
			var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().oData;

			aMessages.forEach(function (oMessage) {
				switch (oMessage.type) {
					case "Error":
						sHighestSeverity = "Reject";
						break;
					case "Warning":
						sHighestSeverity = sHighestSeverity !== "Reject" ? "Emphasized" : sHighestSeverity;
						break;
					case "Success":
						sHighestSeverity = sHighestSeverity !== "Reject" && sHighestSeverity !== "Emphasized" ? "Accept" : sHighestSeverity;
						break;
					default:
						sHighestSeverity = !sHighestSeverity ? "Ghost" : sHighestSeverity;
						break;
				}
			});

			return sHighestSeverity;
		},

		/**
		 * Determines the button icon based on message severity.
		 * Priority: Error > Warning > Success > Info
		 * @public
		 * @returns {string} The icon name
		 */
		getMessageButtonIcon: function () {
			var sIcon = "sap-icon://warning2";
			var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().oData;

			aMessages.forEach(function (oMessage) {
				switch (oMessage.type) {
					case "Error":
						sIcon = "sap-icon://error";
						break;
					case "Warning":
						sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
						break;
					case "Success":
						sIcon = sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://message-success" : sIcon;
						break;
					default:
						sIcon = !sIcon ? "sap-icon://warning2" : sIcon;
						break;
				}
			});

			return sIcon;
		},

		/* =========================================================== */
		/* Navigation Methods                                          */
		/* =========================================================== */

		/**
		 * Navigates to the Purchase Order display application.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onPOLinkPress: function (oEvent) {
			var oBindingContext = this.getView().getBindingContext();
			var sPoNumber = oBindingContext.getProperty("PoNumber");

			if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
				var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

				var sHash = oCrossAppNavigator.hrefForExternal({
					target: {
						semanticObject: "PurchaseOrder",
						action: "displayFactSheet"
					},
					params: {
						"PurchaseOrder": sPoNumber
					}
				});

				var sUrl = window.location.href.split('#')[0] + sHash;
				window.open(sUrl, '_blank');
			}
		},

		/**
		 * Navigates to the Vendor display application.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onVendorLinkPress: function (oEvent) {
			var oBindingContext = this.getView().getBindingContext();
			var sVendor = oBindingContext.getProperty("Vendor");

			if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService) {
				var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

				var sHash = oCrossAppNavigator.hrefForExternal({
					target: {
						semanticObject: "Supplier",
						action: "display"
					},
					params: {
						"Supplier": sVendor
					}
				});

				var sUrl = window.location.href.split('#')[0] + sHash;
				window.open(sUrl, '_blank');
			}
		},

		/* =========================================================== */
		/* Validation Methods                                          */
		/* =========================================================== */

		/**
		 * Validates if a value is a valid number.
		 * @public
		 * @param {any} n The value to validate
		 * @returns {boolean} True if the value is a valid number
		 */
		isNumber: function (n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},

		/**
		 * Validates if a string represents a valid date in DD.MM.YYYY format.
		 * @public
		 * @param {string} sDate The date string to validate
		 * @returns {boolean} True if the date is valid
		 */
		isValidDate: function (sDate) {
			var sDay = sDate.substr(0, 2);
			var sMonth = sDate.substr(3, 2);
			var sYear = sDate.substr(6, 4);

			var sDateValue = sMonth + "/" + sDay + "/" + sYear;
			var oDate = new Date(sDateValue);

			if (oDate.getDate() !== parseInt(sDay, 10)) {
				return false;
			}

			if (oDate.getMonth() !== parseInt(sMonth, 10) - 1) {
				return false;
			}

			if (oDate.getFullYear() !== parseInt(sYear, 10)) {
				return false;
			}

			return true;
		}

	});

});
