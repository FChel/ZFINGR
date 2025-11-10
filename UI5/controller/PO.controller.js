sap.ui.define([
	"./BaseController",
	"../model/formatter",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/FormattedText",
	"sap/m/MessageBox",
	"sap/ui/core/message/Message",
	"sap/ui/core/library",
	"sap/ui/events/KeyCodes",
	"sap/ui/core/syncStyleClass"
], function (BaseController, formatter, JSONModel, Filter, FilterOperator, FormattedText, MessageBox, Message, library, KeyCodes, syncStyleClass) {
	"use strict";

	var MessageType = library.MessageType;
	var ValueState = library.ValueState;

	/**
	 * Purchase Order Controller.
	 * Handles all PO-related functionality including:
	 * - PO selection and display
	 * - Movement line management
	 * - Asset detail management
	 * - Goods receipt posting
	 * 
	 * @namespace defence.finance.finux.gr.controller
	 */
	return BaseController.extend("defence.finance.finux.gr.controller.PO", {

		formatter: formatter,

		/* =========================================================== */
		/* Lifecycle Methods                                           */
		/* =========================================================== */

		/**
		 * Controller initialisation.
		 * Sets up route handlers and initialises the date picker.
		 * @public
		 */
		onInit: function () {
			// Route handlers
			this.getRouter().getRoute("po1").attachPatternMatched(this._onPOMatched, this);
			this.getRouter().getRoute("po0").attachPatternMatched(this._onNoPO, this);

			// Message manager setup
			this.registerMessageManager();

			// Date picker configuration
			this._configureDatePicker();
		},

		/**
		 * Controller cleanup.
		 * Destroys the value help dialogue if it exists.
		 * @public
		 */
		onExit: function () {
			if (this.oValueHelpDialog) {
				this.oValueHelpDialog.destroy();
			}
		},

		/* =========================================================== */
		/* Route Handler Methods                                       */
		/* =========================================================== */

		/**
		 * Handles the matched PO route event.
		 * @private
		 * @param {sap.ui.base.Event} oEvent The route matched event
		 */
		_onPOMatched: function (oEvent) {
			this._resetView();

			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function () {
				this._bindView(sObjectId);
			}.bind(this));
		},

		/**
		 * Handles the no-PO route event (displays PO selection dialogue).
		 * @private
		 * @param {sap.ui.base.Event} oEvent The route matched event
		 */
		_onNoPO: function (oEvent) {
			this._resetView();

			this.getModel().metadataLoaded().then(function () {
				this.getPOSelectDialog().open();
			}.bind(this));
		},

		/* =========================================================== */
		/* Navigation Methods                                          */
		/* =========================================================== */

		/**
		 * Overrides base navigation back to handle unsaved changes.
		 * @private
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		_onNavBack: function (oEvent) {
			var oController = this;
			var oViewModel = this.getModel("viewModel");
			var bHasUnsavedChanges = oViewModel.getProperty("/hasChanges");

			if (bHasUnsavedChanges) {
				MessageBox.warning(this.getResourceBundle().getText("confirmExit"), {
					initialFocus: null,
					actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
					onClose: function (sAction) {
						if (sAction === MessageBox.Action.OK) {
							oController._handleNavigationBack(oEvent);
						}
					}
				});
			} else {
				this._handleNavigationBack(oEvent);
			}
		},

		/**
		 * Handles the actual navigation logic after confirmation.
		 * @private
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		_handleNavigationBack: function (oEvent) {
			this._resetView();

			var oViewModel = this.getModel("viewModel");
			var bInFLP = this.getModel("componentModel").getProperty("/inFLP");

			if (bInFLP) {
				this.onNavHome();
			} else {
				this._onNoPO(oEvent);
			}
		},

		/* =========================================================== */
		/* View Binding Methods                                        */
		/* =========================================================== */

		/**
		 * Resets the view to its initial state.
		 * @private
		 */
		_resetView: function () {
			this.getView().unbindElement();

			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				poSelectInput: "",
				bound: false,
				movtLineCount: 0,
				maxMovtLineId: 0,
				movtTotal: 0,
				movtTotalIncTax: 0,
				itemsCount: 0,
				posted: false,
				itemsScrollHeight: "",
				messageButtonType: "Ghost",
				messageButtonIcon: "sap-icon://warning2",
				poCurrency: "",
				poCompCode: "",
				hasChanges: false
			});
			this.setModel(oViewModel, "viewModel");
		},

		/**
		 * Binds the view to a Purchase Order.
		 * @private
		 * @param {string} sObjectId The PO number
		 */
		_bindView: function (sObjectId) {
			var sPoNumber = sObjectId;
			if (sPoNumber.length >= 10) {
				sPoNumber = sPoNumber.substring(0, 10);
			}

			var oModel = this.getOwnerComponent().getModel();
			var sObjectPath = oModel.createKey("/PurchaseOrders", {
				PoNumber: sPoNumber
			});

			this._bindElement(sObjectPath);
		},

		/**
		 * Binds the view element with event handlers.
		 * @private
		 * @param {string} sObjectPath The object path to bind
		 */
		_bindElement: function (sObjectPath) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", true);

			var bDataRequested = false;
			var oController = this;

			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "Items,Movements,MaterialDocuments,Assets"
				},
				events: {
					change: this._onBindingChange.bind(this, bDataRequested),
					dataRequested: this._onDataRequested.bind(this),
					dataReceived: this._onDataReceived.bind(this, oController)
				}
			});
		},

		/**
		 * Handles binding change event.
		 * @private
		 * @param {boolean} bDataRequested Flag indicating if data was requested
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		_onBindingChange: function (bDataRequested, oEvent) {
			this.getModel("viewModel").setProperty("/busy", false);

			if (!bDataRequested) {
				var oContextBinding = oEvent.getSource();
				oContextBinding.refresh(false);
			}
		},

		/**
		 * Handles data requested event.
		 * @private
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		_onDataRequested: function (oEvent) {
			this.getModel("viewModel").setProperty("/bound", false);
		},

		/**
		 * Handles data received event and validates the PO.
		 * @private
		 * @param {object} oController The controller instance
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		_onDataReceived: function (oController, oEvent) {
			var oViewModel = oController.getModel("viewModel");
			oViewModel.setProperty("/busy", false);

			var oPO = oEvent.getParameters("data").data;

			if (!oPO || oPO.PoNumber === "") {
				this._showErrorAndNavigate("poNotFoundErrorText");
			} else if (oPO.Excluded) {
				this._showErrorAndNavigate("poExcluded");
			} else if (!oPO.Complete) {
				this._showErrorAndNavigate("poNotComplete");
			} else if (!oPO.Approved) {
				this._showErrorAndNavigate("poNotApproved", true);
			} else if (oPO.Items.length === 0 && !oViewModel.getProperty("/posted")) {
				this._showErrorAndNavigate("poNotValidForGRErrorText");
			} else {
				this._setupModelsAndData(oPO, oViewModel);
			}
		},

		/**
		 * Shows an error message using message button and navigates away.
		 * @private
		 * @param {string} sMessageKey The i18n message key
		 * @param {boolean} [bIsFormattedText=false] Whether to use FormattedText
		 */
		_showErrorAndNavigate: function (sMessageKey, bIsFormattedText) {
			var oController = this;
			var sMessage = this.getResourceBundle().getText(sMessageKey);
			
			// Add error message to message manager
			sap.ui.getCore().getMessageManager().removeAllMessages();
			sap.ui.getCore().getMessageManager().addMessages(new Message({
				message: sMessage,
				type: MessageType.Error,
				processor: this.getView().getModel()
			}));
			
			// Update message button state
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/messageButtonType", this.getMessageButtonType());
			oViewModel.setProperty("/messageButtonIcon", this.getMessageButtonIcon());
			
			// Navigate to PO selection
			this._onNoPO();
			
			// Open message popover after a short delay to allow view to load
			setTimeout(function() {
				var oButton = oController.byId("messagesButton");
				if (oButton) {
					oButton.firePress();
				}
			}, 300);
		},

		/**
		 * Sets up models and data after successful PO load.
		 * @private
		 * @param {object} oPO The PO data
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_setupModelsAndData: function (oPO, oViewModel) {
			// Item model setup
			var oItemModel = new JSONModel();
			if (oPO.Items.length > 100) {
				oItemModel.setSizeLimit(oPO.Items.length);
			}
			oItemModel.setData(oPO.Items);
			this.setModel(oItemModel, "itemModel");

			// Movement model setup
			var oMovtModel = new JSONModel();
			oMovtModel.setData(oPO.Movements);
			this.setModel(oMovtModel, "movtModel");

			// Asset model setup
			var oAssetModel = new JSONModel();
			oAssetModel.setData(oPO.Assets);
			this.setModel(oAssetModel, "assetModel");

			// Initialise movement lines
			oViewModel.setProperty("/maxMovtLineId", 0);
			this.onAddMovtLine();

			// View model properties
			oViewModel.setProperty("/itemsCount", oPO.Items.length);
			oViewModel.setProperty("/itemsScrollHeight", oPO.Items.length > 10 ? "35rem" : "auto");
			oViewModel.setProperty("/poCurrency", oPO.Currency);
			oViewModel.setProperty("/poCompCode", oPO.CompCode);
			oViewModel.setProperty("/bound", true);

			// Clear messages
			sap.ui.getCore().getMessageManager().removeAllMessages();
			
			// Set focus
			this._setFocusOnMovements();
		},

		/**
		 * Sets focus on the first movement line PO item dropdown.
		 * @private
		 */
		_setFocusOnMovements: function() {
			var oController = this;
			var oMovementsTable = oController.byId("movementsTable");
			oMovementsTable.focus();
		},
		
		/* =========================================================== */
		/* Field Change Tracking                                       */
		/* =========================================================== */

		/**
		 * Tracks field changes for unsaved data warning.
		 * @private
		 */
		_onFieldChange: function () {
			this.getModel("viewModel").setProperty("/hasChanges", true);
		},

		/* =========================================================== */
		/* Movement Line Management                                    */
		/* =========================================================== */

		/**
		 * Adds a new movement line to the table.
		 * @public
		 * @param {sap.ui.base.Event} [oEvent] The event object
		 */
		onAddMovtLine: function (oEvent) {
			var oViewModel = this.getModel("viewModel");
			var oDoc = this.getView().getBindingContext() ? this.getView().getBindingContext().getObject() : {};

			this.getModel("movtModel").getProperty("/").push({
				MovtId: oViewModel.getProperty("/maxMovtLineId") + 1,
				PoItem: "",
				PoItemVs: ValueState.None,
				RefDocNo: "",
				HeaderTxt: "",
				DocDate: null,
				IsAsset: false,
				EntryQnt: "",
				EntryQntVs: ValueState.None,
				EntryUom: "",
				DocDateVs: ValueState.None,
				LineStatus: MessageType.None
			});

			this.refreshMovts();
		},

		/**
		 * Copies an existing movement line.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onCopyMovtLine: function (oEvent) {
			var oButton = oEvent.getSource();
			var oBindingContext = oButton.getBindingContext("movtModel");
			var sPath = oBindingContext.getPath();
			var iIndex = parseInt(sPath.substr(1), 10);
			var oItem = this.getModel("movtModel").getProperty("/")[iIndex];

			var oNewItem = jQuery.extend(true, {}, oItem);
			oNewItem.MovtId = this.getModel("viewModel").getProperty("/maxMovtLineId") + 1;
			oNewItem.PoItem = "";
			oNewItem.EntryQnt = "";
			oNewItem.IsAsset = false;

			this.getModel("movtModel").getProperty("/").push(oNewItem);
			this.refreshMovts();
		},

		/**
		 * Deletes a movement line.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onDeleteMovtLine: function (oEvent) {
			var oButton = oEvent.getSource();
			var oBindingContext = oButton.getBindingContext("movtModel");
			var sPath = oBindingContext.getPath();
			var iIndex = parseInt(sPath.substr(1), 10);

			this.getModel("movtModel").getProperty("/").splice(iIndex, 1);
			this.refreshMovts();
		},

		/**
		 * Refreshes movement calculations and updates totals.
		 * @public
		 */
		refreshMovts: function () {
			var oViewModel = this.getModel("viewModel");
			var aItems = this.getModel("itemModel").getProperty("/");

			this.getModel("movtModel").refresh();
			var aMovts = this.getModel("movtModel").getProperty("/");

			var iMaxId = 0;
			var iMovtTotal = 0;
			var iMovtTotalIncTax = 0;

			for (var i = 0; i < aMovts.length; i++) {
				if (aMovts[i].MovtId > iMaxId) {
					iMaxId = aMovts[i].MovtId;
				}

				var iLineTotal = 0;
				var iLineTax = 0;

				for (var j = 0; j < aItems.length; j++) {
					if (aItems[j].PoItem === aMovts[i].PoItem) {
						iLineTotal = Number(aItems[j].NetPrice) * Number(aMovts[i].EntryQnt);
						iLineTax = iLineTotal * Number(aItems[j].TaxRate);
						aMovts[i].IsAsset = aItems[j].IsAsset;
						break;
					}
				}

				iMovtTotal += iLineTotal;
				iMovtTotalIncTax += iLineTotal + iLineTax;
			}

			oViewModel.setProperty("/maxMovtLineId", iMaxId);
			oViewModel.setProperty("/movtLineCount", aMovts.length);
			oViewModel.setProperty("/movtTotal", iMovtTotal);
			oViewModel.setProperty("/movtTotalIncTax", iMovtTotalIncTax);
			oViewModel.setProperty("/hasChanges", true);
		},

		/**
		 * Handles PO item selection in movement line.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		selectMovtPoItem: function (oEvent) {
			this.refreshMovts();

			var oSource = oEvent.getSource();
			var sSelectedItem = oSource.getSelectedItem().getKey();
			var aItems = this.getModel("itemModel").getProperty("/");
			var aMovts = this.getModel("movtModel").getProperty("/");

			this.getModel("movtModel").refresh();

			for (var i = 0; i < aMovts.length; i++) {
				for (var j = 0; j < aItems.length; j++) {
					if (sSelectedItem === aMovts[i].PoItem && aMovts[i].PoItem === aItems[j].PoItem) {
						aMovts[i].IsAsset = aItems[j].IsAsset;
					}
				}
			}
		},

		/**
		 * Handles live change event for quantity field.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onLiveChangeQty: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			var sPrevValue = oEvent.getParameter("previousValue");

			if (!this.isNumber(sValue)) {
				var fTotal = parseFloat(sValue);
				if (isNaN(fTotal)) {
					fTotal = parseFloat(sPrevValue);
					if (isNaN(fTotal)) {
						fTotal = "";
					}
				}
				oEvent.getSource().setValue(fTotal);
			}
		},

		/* =========================================================== */
		/* Validation and Submission                                   */
		/* =========================================================== */

		/**
		 * Validates and submits movement data.
		 * @public
		 */
		onSubmit: function () {
			var oViewModel = this.getModel("viewModel");

			// Reset all errors
			sap.ui.getCore().getMessageManager().removeAllMessages();
			this._clearValidationStates();
			this.getMessagePopover().close();

			// Validate fields
			var bMandatoryMissing = this._validateMandatoryFields();

			if (bMandatoryMissing) {
				this._addMessage("mandatoryMissingError", MessageType.Error);
				return;
			}

			// Prepare and submit data
			this._prepareAndSubmitData(oViewModel);
		},

		/**
		 * Clears all validation states.
		 * @private
		 */
		_clearValidationStates: function () {
			var oViewModel = this.getModel("viewModel");
			var aItems = this.getModel("movtModel").getProperty("/");

			oViewModel.setProperty("/movtConfirmValueState", ValueState.None);

			for (var i = 0; i < aItems.length; i++) {
				this.getModel("movtModel").setProperty("/" + i + "/PoItemVs", ValueState.None);
				this.getModel("movtModel").setProperty("/" + i + "/EntryQntVs", ValueState.None);
				this.getModel("movtModel").setProperty("/" + i + "/DocDateVs", ValueState.None);
				this.getModel("movtModel").setProperty("/" + i + "/LineStatus", MessageType.None);
			}
		},

		/**
		 * Validates mandatory fields.
		 * @private
		 * @returns {boolean} True if mandatory fields are missing
		 */
		_validateMandatoryFields: function () {
			var bMandatoryMissing = false;
			var aItems = this.getModel("movtModel").getProperty("/");

			for (var i = 0; i < aItems.length; i++) {
				// Validate PO Item
				if (aItems[i].PoItem === "") {
					this.getModel("movtModel").setProperty("/" + i + "/PoItemVs", ValueState.Error);
					bMandatoryMissing = true;
				} else {
					// Check for duplicates
					for (var j = 0; j < aItems.length; j++) {
						if (j !== i && aItems[j].PoItem === aItems[i].PoItem) {
							this._addError(this.getResourceBundle().getText("duplicatePoItemError"), "/" + j + "/PoItemVs");
						}
					}
				}

				// Validate Quantity
				if (aItems[i].EntryQnt === "") {
					this.getModel("movtModel").setProperty("/" + i + "/EntryQntVs", ValueState.Error);
					bMandatoryMissing = true;
				} else if (!this.isNumber(aItems[i].EntryQnt)) {
					this._addMessage("quantityNotNumberError", MessageType.Error, [aItems[i].EntryQnt]);
					this.getModel("movtModel").setProperty("/" + i + "/EntryQntVs", ValueState.Error);
				}

				// Validate Date
				if (!aItems[i].DocDate) {
					this.getModel("movtModel").setProperty("/" + i + "/DocDateVs", ValueState.Error);
					bMandatoryMissing = true;
				}
			}

			return bMandatoryMissing;
		},

		/**
		 * Prepares data and submits to backend for validation.
		 * @private
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_prepareAndSubmitData: function (oViewModel) {
			var oBindingContext = this.getView().getBindingContext();
			var oData = this.getModel().getObject(oBindingContext.getPath(), { expand: 'Items,MaterialDocuments' });
			oData.SubmitFlag = false;
			oData.GrValue = oViewModel.getProperty("/movtTotalIncTax").toString();

			var oMovtData = this.getModel("movtModel").oData;
			oData.Movements = oMovtData;

			for (var i = 0; i < oData.Movements.length; i++) {
				if (!this.isNumber(oData.Movements[i].EntryQnt)) {
					oData.Movements[i].EntryQnt = "0";
				}
			}

			this._submitForValidation(oData, oViewModel);
		},

		/**
		 * Submits data to backend for validation.
		 * @private
		 * @param {object} oData The data to submit
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_submitForValidation: function (oData, oViewModel) {
			var oController = this;
			oViewModel.setProperty("/busy", true);

			var oModel = this.getOwnerComponent().getModel();
			oModel.create("/PurchaseOrders", oData, {
				success: function (oResult, oResponse) {
					oController._handleValidationResponse(oResult, oData, oViewModel);
				},
				error: function (oError) {
					oViewModel.setProperty("/busy", false);
				}
			});
		},

		/**
		 * Handles the validation response from backend.
		 * @private
		 * @param {object} oResult The result object
		 * @param {object} oData The original data
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_handleValidationResponse: function (oResult, oData, oViewModel) {
			oViewModel.setProperty("/busy", false);

			// Update movement model with response
			var aMovt = oResult.Movements.results;
			for (var i = 0; i < aMovt.length; i++) {
				if (aMovt[i].PoItem === "00000") {
					aMovt[i].PoItem = "";
				}
				if (aMovt[i].EntryQnt === "0.000") {
					aMovt[i].EntryQnt = "";
				}
			}

			var oMovtModel = new JSONModel();
			oMovtModel.setData(aMovt);
			this.setModel(oMovtModel, "movtModel");

			// Check for errors and warnings
			var aMessage = this.getModel("message").oData;
			var bError = false;
			var bDuplicateWarning = false;

			for (var i = 0; i < aMessage.length; i++) {
				if (aMessage[i].type === "Error") {
					bError = true;
				}
				if (aMessage[i].code === "ZFSS_GR/003") {
					bDuplicateWarning = true;
				}
			}

			if (bError) {
				var oButton = this.byId("messagesButton");
				oButton.firePress(oButton);
			} else {
				this._handleWarningsAndConfirm(oData, oResult, bDuplicateWarning);
			}

			oViewModel.setProperty("/messageButtonType", this.getMessageButtonType());
			oViewModel.setProperty("/messageButtonIcon", this.getMessageButtonIcon());
		},

		/**
		 * Handles warnings and confirms GR posting.
		 * @private
		 * @param {object} oData The data object
		 * @param {object} oResult The result object
		 * @param {boolean} bDuplicateWarning Whether there is a duplicate warning
		 */
		_handleWarningsAndConfirm: function (oData, oResult, bDuplicateWarning) {
			if (bDuplicateWarning) {
				this._showDuplicateWarning(oData, oResult);
			} else {
				this._confirmGRPost(oData);
			}
		},

		/**
		 * Shows duplicate warning dialogue.
		 * @private
		 * @param {object} oData The data object
		 * @param {object} oResult The result object
		 */
		_showDuplicateWarning: function (oData, oResult) {
			var oController = this;
			var sText = this.getResourceBundle().getText("duplicateWarningText1", [oResult.MaterialDocuments.results.length]);

			for (var i = 0; i < oResult.MaterialDocuments.results.length; i++) {
				sText += "<li>" + oResult.MaterialDocuments.results[i].MatDoc + "</li>";
			}
			sText += this.getResourceBundle().getText("duplicateWarningText2");

			var oFormattedText = new FormattedText("", { htmlText: sText });

			MessageBox.warning(oFormattedText, {
				title: this.getResourceBundle().getText("duplicateWarningTitle"),
				initialFocus: null,
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						oController._confirmGRPost(oData);
					}
				}
			});
		},

		/**
		 * Shows final confirmation dialogue before posting.
		 * @private
		 * @param {object} oData The data object
		 */
		_confirmGRPost: function (oData) {
			var oController = this;
			var sText = this.getResourceBundle().getText("createConfirmText");
			var oFormattedText = new FormattedText("", { htmlText: sText });

			MessageBox.warning(oFormattedText, {
				title: this.getResourceBundle().getText("createConfirmTitle"),
				initialFocus: null,
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						oController._postGR(oData);
					}
				}
			});
		},

		/**
		 * Posts the goods receipt to the backend.
		 * @private
		 * @param {object} oData The data object
		 */
		_postGR: function (oData) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", true);

			sap.ui.getCore().getMessageManager().removeAllMessages();

			oData.SubmitFlag = true;

			var oController = this;
			var oModel = this.getOwnerComponent().getModel();
			oModel.create("/PurchaseOrders", oData, {
				success: function (oResult, oResponse) {
					oController._handlePostResponse(oResult, oViewModel);
				},
				error: function (oError) {
					oViewModel.setProperty("/busy", false);
				}
			});
		},

		/**
		 * Handles the post response.
		 * @private
		 * @param {object} oResult The result object
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_handlePostResponse: function (oResult, oViewModel) {
			oViewModel.setProperty("/busy", false);

			var bError = false;
			var aMessage = this.getModel("message").oData;

			for (var i = 0; i < aMessage.length; i++) {
				if (aMessage[i].type === "Error") {
					bError = true;
					break;
				}
			}

			if (bError) {
				this._showPostErrorDialog(oResult, aMessage);
			} else {
				this._showPostSuccessDialog(oResult, oViewModel);
			}
		},

		/**
		 * Shows error using message button after post failure.
		 * @private
		 * @param {object} oResult The result object
		 * @param {Array} aMessage Array of messages		 */
		_showPostErrorDialog: function (oResult, aMessage) {
			// Errors are already in the message manager from the backend response
			// Just update the message button state and open the popover
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/messageButtonType", this.getMessageButtonType());
			oViewModel.setProperty("/messageButtonIcon", this.getMessageButtonIcon());
			
			// Automatically open the message popover to show the errors
			var oButton = this.byId("messagesButton");
			if (oButton) {
				oButton.firePress();
			}
		},

		/**
		 * Shows success dialogue after successful post.
		 * @private
		 * @param {object} oResult The result object
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_showPostSuccessDialog: function (oResult, oViewModel) {
			oViewModel.setProperty("/posted", true);
			this.getView().getElementBinding().refresh();

			var oController = this;
			var sText = this.getResourceBundle().getText("successText1", [oResult.MaterialDocuments.results.length, oResult.PoNumber]);

			for (var i = 0; i < oResult.MaterialDocuments.results.length; i++) {
				sText += "<li>" + oResult.MaterialDocuments.results[i].MatDoc + "</li>";
			}
			sText += this.getResourceBundle().getText("successText2");

			this._createRatingDialog(sText, oResult, oViewModel);
		},

		/**
		 * Creates and displays the rating dialogue.
		 * @private
		 * @param {string} sText The success message text
		 * @param {object} oResult The result object
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_createRatingDialog: function (sText, oResult, oViewModel) {
			var oController = this;

			var oRating = this.getModel("common").createEntry("/FeedbackRatings").getObject();
			oRating.Rating = 0;
			oRating.Comments = "";
			oRating.SourceObj = "GR";
			oRating.SourceKey = oResult.MaterialDocuments.results[0].MatDoc;
			delete oRating.__metadata;

			var oRateModel = new JSONModel(oRating);

			var dialog = new sap.m.Dialog({
				title: this.getResourceBundle().getText("successTitle"),
				type: "Message",
				state: "Success",
				busyIndicatorDelay: 0,
				content: [
					new sap.m.VBox({
						items: [
							new FormattedText({ htmlText: sText }),
							new sap.m.Label({ text: "" }),
							new sap.m.Label({ text: this.getResourceBundle().getText("ratingLabel") }),
							new sap.m.RatingIndicator({
								maxValue: 5,
				value: "{/Rating}",
								visualMode: sap.m.RatingIndicatorVisualMode.Full
							}),
							new sap.m.Label({ text: this.getResourceBundle().getText("feedbackLabel") }),
							new sap.m.TextArea({
								value: "{/Comments}",
								width: "100%",
								placeholder: "Add " + this.getResourceBundle().getText("feedbackLabel"),
								rows: 3
							})
						]
					})
				],
				beginButton: new sap.m.Button({
					text: "Ok",
					type: sap.m.ButtonType.Emphasized,
					press: function (oEvent1) {
						oController._handleRatingSubmission(oEvent1, dialog, oViewModel);
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.addStyleClass("sapUiSizeCompact");
			dialog.setModel(oRateModel);
			dialog.open();
		},

		/**
		 * Handles rating submission.
		 * After successful GR creation, returns user to PO selection dialogue.
		 * @private
		 * @param {sap.ui.base.Event} oEvent The event object
		 * @param {sap.m.Dialog} dialog The dialogue instance
		 * @param {sap.ui.model.json.JSONModel} oViewModel The view model
		 */
		_handleRatingSubmission: function (oEvent, dialog, oViewModel) {
			var oController = this;
			var oRating = oEvent.getSource().getModel().getData();
			dialog.setBusy(true);

			var ratingPromise = jQuery.Deferred();

			if (!oRating.Rating && !oRating.Comments) {
				ratingPromise.resolve();
			} else {
				oRating.Rating += "";
				this.getModel("common").create("/FeedbackRatings", oRating, {
					success: function () {
						ratingPromise.resolve();
					},
					error: function () {
						ratingPromise.resolve();
					}
				});
				setTimeout(function () {
					ratingPromise.resolve();
				}, 700);
			}

			ratingPromise.then(function () {
				dialog.setBusy(false);
				
				// Close rating dialogue first, then show PO select dialogue
				dialog.attachEventOnce("afterClose", function() {
					// Reset the view to clear any posted GR data
					oController._resetView();
					
					// Clear the PO input field
					oController.getModel("viewModel").setProperty("/poSelectInput", "");
					
					// Open PO selection dialogue for next GR
					oController.getModel().metadataLoaded().then(function () {
						oController.getPOSelectDialog().open();
					});
				});
				
				dialog.close();
			});
		},

		/* =========================================================== */
		/* Error Handling Helper Methods                               */
		/* =========================================================== */

		/**
		 * Adds an error message with field validation.
		 * @private
		 * @param {string} sMessage The error message
		 * @param {string} sTarget The target field path
		 */
		_addError: function (sMessage, sTarget) {
			var bAlreadyIn = false;
			var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().oData;

			aMessages.forEach(function (oMessage) {
				if (oMessage.message === sMessage) {
					bAlreadyIn = true;
				}
			});

			if (!bAlreadyIn) {
				sap.ui.getCore().getMessageManager().addMessages(new Message({
					message: sMessage,
					type: MessageType.Error
				}));
			}

			this.getModel("movtModel").setProperty(sTarget, ValueState.Error);
		},

		/**
		 * Adds a message to the message manager.
		 * @private
		 * @param {string} sMessageKey The i18n message key
		 * @param {string} sMessageType The message type
		 * @param {Array} [aParams] Optional parameters for the message
		 */
		_addMessage: function (sMessageKey, sMessageType, aParams) {
			var sMessage = aParams ?
				this.getResourceBundle().getText(sMessageKey, aParams) :
				this.getResourceBundle().getText(sMessageKey);

			var oMessage = new Message({
				message: sMessage,
				type: sMessageType
			});

			sap.ui.getCore().getMessageManager().addMessages(oMessage);
		},

		/* =========================================================== */
		/* Asset Detail Methods                                        */
		/* =========================================================== */

		/**
		 * Opens the asset detail dialogue.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onAssetDetail: function (oEvent) {
			var oViewModel = this.getModel("viewModel");
			var oSource = oEvent.getSource();
			var oBindingContext = oSource.getBindingContext("movtModel");
			var sPath = oBindingContext.getPath();
			var iIndex = parseInt(sPath.substr(1), 10);
			var oItem = this.getModel("movtModel").getProperty("/")[iIndex];

			var sAssets = this.getModel("assetModel").getJSON();
			var aAssetsFiltered = this._filterByProperty(JSON.parse(sAssets), { PoItem: oItem.PoItem });
			var oAssetModelFiltered = new JSONModel(aAssetsFiltered);
			var oAsset = oAssetModelFiltered.oData[0];

			var oModel = this.getOwnerComponent().getModel();
			var sObjectPath = oModel.createKey("/Assets", {
				CompCode: oViewModel.getProperty("/poCompCode"),
				AssetNo: oAsset.AssetNo,
				SubNumber: oAsset.SubNumber
			});

			this.getAssetDetailDialog().bindElement({
				path: sObjectPath,
				events: {
					change: function (oEvent) {},
					dataRequested: function (oEvent) {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function (oEvent) {
						oViewModel.setProperty("/busy", false);
					}
				}
			});

			this.getAssetDetailDialog().open();
		},

		/**
		 * Filters an array of objects by property criteria.
		 * @private
		 * @param {Array} aObjects Array of objects to filter
		 * @param {object} oCriteria Object with property criteria
		 * @returns {Array} Filtered array
		 */
		_filterByProperty: function (aObjects, oCriteria) {
			return aObjects.filter(function (oObj) {
				return Object.keys(oCriteria).every(function (sKey) {
					return oObj[sKey] === oCriteria[sKey];
				});
			});
		},

		/**
		 * Updates asset detail and closes the dialogue.
		 * @public
		 */
		onAssetDetailUpdate: function () {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", true);

			var oBindingContext = this.getAssetDetailDialog().getBindingContext();
			var oData = this.getModel().getObject(oBindingContext.getPath());

			var oModel = this.getOwnerComponent().getModel();
			var oController = this;
			
			oModel.create("/Assets", oData, {
				success: function (oResult, oResponse) {
					oViewModel.setProperty("/busy", false);

					var aMessages = oController.getModel("message").oData;
					var oMessage = aMessages[0];

					if (oMessage.type === "Success") {
						oController.getAssetDetailDialog().close();
						sap.m.MessageToast.show(oMessage.message, {
							my: sap.ui.core.Popup.Dock.CenterCenter,
							at: sap.ui.core.Popup.Dock.CenterCenter,
							width: "20em"
						});
					} else {
						// Error is already in message manager from backend
						// Close dialogue and show in message button
						oController.getAssetDetailDialog().close();
						
						// Update message button state
						oViewModel.setProperty("/messageButtonType", oController.getMessageButtonType());
						oViewModel.setProperty("/messageButtonIcon", oController.getMessageButtonIcon());
						
						// Open message popover
						var oButton = oController.byId("messagesButton");
						if (oButton) {
							oButton.firePress();
						}
					}
				},
				error: function (oError) {
					oViewModel.setProperty("/busy", false);
				}
			});
		},

		/**
		 * Closes the asset detail dialogue without saving.
		 * @public
		 */
		onAssetDetailCancel: function () {
			this.getAssetDetailDialog().close();
		},

		/**
		 * Gets or creates the asset detail dialogue.
		 * @private
		 * @returns {sap.m.Dialog} The asset detail dialogue
		 */
		getAssetDetailDialog: function () {
			if (!this.oAssetDetails) {
				this.oAssetDetails = sap.ui.xmlfragment("defence.finance.finux.gr.view.POAssetDetail", this);
				this.oAssetDetails.setEscapeHandler(function (oEscHandler) {
					oEscHandler.reject();
				});
				syncStyleClass("sapUiSizeCompact", this.getView(), this.oAssetDetails);
				this.getView().addDependent(this.oAssetDetails);
			}
			return this.oAssetDetails;
		},

		/* =========================================================== */
		/* PO Select Dialog Methods                                    */
		/* =========================================================== */

		/**
		 * Handles PO select dialogue OK button.
		 * Validates input and navigates to PO display.
		 * @public
		 */
		onPoSelectOK: function () {
			var sPoNumber = this.getModel("viewModel").getProperty("/poSelectInput");

			if (sPoNumber === "") {
				// Add error message to message manager
				sap.ui.getCore().getMessageManager().removeAllMessages();
				sap.ui.getCore().getMessageManager().addMessages(new Message({
					message: this.getResourceBundle().getText("poBlankErrorText"),
					type: MessageType.Error,
					processor: this.getView().getModel()
				}));
				
				// Update message button state
				var oViewModel = this.getModel("viewModel");
				oViewModel.setProperty("/messageButtonType", this.getMessageButtonType());
				oViewModel.setProperty("/messageButtonIcon", this.getMessageButtonIcon());
				
				// Close dialogue and show error in message button
				var oDialog = this.getPOSelectDialog();
				var oController = this;
				oDialog.attachEventOnce("afterClose", function() {
					// Open message popover after dialogue closes
					var oButton = oController.byId("messagesButton");
					if (oButton) {
						oButton.firePress();
					}
				});
				oDialog.close();
			} else {
				var oDialog = this.getPOSelectDialog();
				var oRouter = this.getRouter();
				
				// Close dialogue first, then navigate after it is closed
				oDialog.attachEventOnce("afterClose", function() {
					oRouter.navTo("po1", {
						objectId: sPoNumber
					}, false);
				});
				
				oDialog.close();
			}
		},

		/**
		 * Handles PO select dialogue Cancel button.
		 * Closes the dialogue and navigates home.
		 * @public
		 */
		onPoSelectCancel: function () {
			var oDialog = this.getPOSelectDialog();
			var oController = this;
			
			// Close dialogue first, then navigate after it is closed
			oDialog.attachEventOnce("afterClose", function() {
				oController.onNavHome();
			});
			
			oDialog.close();
		},

		/**
		 * Gets or creates the PO select dialogue.
		 * @private
		 * @returns {sap.m.Dialog} The PO select dialogue
		 */
		getPOSelectDialog: function () {
			if (!this.oPOSelectDialog) {
				this.oPOSelectDialog = sap.ui.xmlfragment("defence.finance.finux.gr.view.POSelectDialog", this);
				this.oPOSelectDialog.setEscapeHandler(function (oEscHandler) {
					oEscHandler.reject();
				});
				syncStyleClass("sapUiSizeCompact", this.getView(), this.oPOSelectDialog);
				this.getView().addDependent(this.oPOSelectDialog);
			}
			return this.oPOSelectDialog;
		},

		/* =========================================================== */
		/* PO Value Help Methods                                       */
		/* =========================================================== */

		/**
		 * Opens the PO value help dialogue.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onPOValueHelpRequested: function (oEvent) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", true);

			var oResourceBundle = this.getResourceBundle();
			var oDType = new sap.ui.model.type.Date({ pattern: "dd.MM.yyyy" });

			var oColModel = new JSONModel();
			oColModel.setData({
				cols: [
					{ label: oResourceBundle.getText("vhPO"), template: "PoNumber" },
					{ label: oResourceBundle.getText("vhOA"), template: "OaNumber" },
					{ label: oResourceBundle.getText("vhVendor"), template: "Vendor" },
					{ label: oResourceBundle.getText("vhVendorName"), template: "VendorName", width: "19rem" },
					{ label: oResourceBundle.getText("vhABN"), template: "Abn" },
					{ label: oResourceBundle.getText("vhCreateDate"), template: "CreatDate", oType: oDType }
				]
			});

			this._setupValueHelpDialog(oColModel, oResourceBundle);
			oViewModel.setProperty("/busy", false);
		},

		/**
		 * Sets up the value help dialogue.
		 * @private
		 * @param {sap.ui.model.json.JSONModel} oColModel Column model
		 * @param {object} oResourceBundle Resource bundle
		 */
		_setupValueHelpDialog: function (oColModel, oResourceBundle) {
			var oController = this;

			if (!this.oValueHelpDialog) {
				this.oValueHelpDialog = sap.ui.xmlfragment("defence.finance.finux.gr.view.POValueHelp", this);
				syncStyleClass("sapUiSizeCompact", this.getView(), this.oValueHelpDialog);
				this.getView().addDependent(this.oValueHelpDialog);

				this.oValueHelpDialog.attachBrowserEvent("keydown", function (oEvent) {
					if (oEvent.keyCode === KeyCodes.ENTER) {
						oEvent.stopImmediatePropagation();
						oEvent.preventDefault();
						oController.oValueHelpDialog.getFilterBar().search();
					}
				});

				this.oValueHelpDialog.getTableAsync().then(function (oTable) {
					oTable.setModel(this.getOwnerComponent().getModel());
					oTable.setModel(oColModel, "columns");
					if (oTable.bindRows) {
						oTable.bindRows("/PurchaseOrderLookups");
					}
					oTable.setBusyIndicatorDelay(1);
					oTable.setEnableBusyIndicator(true);
					this.oValueHelpDialog.update();
				}.bind(this));

				this.oValueHelpDialog._sTableTitleNoCount = oResourceBundle.getText("vhTableTitle");

				var oFilterBar = this.oValueHelpDialog.getFilterBar();
				oFilterBar._oHideShowButton.setVisible(false);
			}

			this.oValueHelpDialog.getTable().setNoData(oResourceBundle.getText("vhNoData1"));
			this.oValueHelpDialog.setTokens([]);
			this.oValueHelpDialog.open();
		},

		/**
		 * Handles value help OK button press.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onPoValueHelpOkPress: function (oEvent) {
			var oToken = oEvent.getParameter("tokens")[0];
			this.getModel("viewModel").setProperty("/poSelectInput", oToken.getKey());
			this.oValueHelpDialog.close();
		},

		/**
		 * Handles value help Cancel button press.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onPoValueHelpCancelPress: function (oEvent) {
			this.oValueHelpDialog.close();
		},

		/**
		 * Handles value help after close event.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onPoValueHelpAfterClose: function (oEvent) {
			// Placeholder for future functionality
		},

		/**
		 * Handles value help filter bar search.
		 * @public
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onPoFilterBarSearch: function (oEvent) {
			var oController = this;
			var aSelectionSet = oEvent.getParameter("selectionSet");
			var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					if (oControl.getName() === "CreatDate") {
						var sDate = oControl.getValue();
						var oDate1 = oController._parseDateString(sDate.substring(0, 10));
						var oDate2 = oController._parseDateString(sDate.substring(sDate.length - 10));

						aResult.push(new Filter({
							path: 'CreatDate',
							operator: FilterOperator.BT,
							value1: oDate1,
							value2: oDate2
						}));
					} else {
						aResult.push(new Filter({
							path: oControl.getName(),
							operator: FilterOperator.Contains,
							value1: oControl.getValue()
						}));
					}
				}
				return aResult;
			}, []);

			var oBinding = this.oValueHelpDialog.getTable().getBinding("rows");
			this.oValueHelpDialog.getTable().setNoData(this.getResourceBundle().getText("vhNoData2"));

			if (aFilters.length > 0) {
				var oFilter = new Filter({
					filters: aFilters,
					and: true
				});
				oBinding.filter(oFilter);
			} else {
				MessageBox.error(this.getResourceBundle().getText("vhNoParameter"));
			}
		},

		/**
		 * Parses a date string in DD.MM.YYYY format.
		 * @private
		 * @param {string} sDate The date string
		 * @returns {Date} The parsed date
		 */
		_parseDateString: function (sDate) {
			return new Date(
				sDate.substr(6, 4),
				parseInt(sDate.substr(3, 2), 10) - 1,
				sDate.substr(0, 2)
			);
		},

		/* =========================================================== */
		/* Configuration Methods                                       */
		/* =========================================================== */

		/**
		 * Configures the date picker with maximum date.
		 * @private
		 */
		_configureDatePicker: function () {
			var oDP = this.byId("movtDatePicker");
			if (oDP) {
				oDP.setMaxDate(new Date());
			}
		}

	});

});
