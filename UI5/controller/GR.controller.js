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

	return BaseController.extend("defence.finance.finux.gr.controller.GR", {

		formatter: formatter,

		/* =========================================================== */
		/* Constants                                                   */
		/* =========================================================== */

		_MAT_DOC_LENGTH: 10,
		_DOC_YEAR_LENGTH: 4,
		_FULL_OBJECT_ID_LENGTH: 14,

		/* =========================================================== */
		/* Lifecycle Methods                                           */
		/* =========================================================== */

		/**
		 * Controller initialisation
		 * @public
		 */
		onInit: function () {
			// Attach route handlers
			this._attachRouteHandlers();

			// Register message manager
			this.registerMessageManager();
		},

		/**
		 * Cleanup method called when controller is destroyed
		 * @public
		 */
		onExit: function () {
			// Destroy fragments to prevent memory leaks
			if (this._actionSheet) {
				this._actionSheet.destroy();
				this._actionSheet = null;
			}

			if (this.oGRSelectDialog) {
				this.oGRSelectDialog.destroy();
				this.oGRSelectDialog = null;
			}

			if (this.oValueHelpDialog) {
				this.oValueHelpDialog.destroy();
				this.oValueHelpDialog = null;
			}
		},

		/* =========================================================== */
		/* Route Handlers                                              */
		/* =========================================================== */

		/**
		 * Attaches pattern matched events to routes
		 * @private
		 */
		_attachRouteHandlers: function () {
			var oRouter = this.getRouter();

			// Attach route pattern matched events
			oRouter.getRoute("gr1").attachPatternMatched(this._onGRDisplayMatched, this);
			oRouter.getRoute("gr0").attachPatternMatched(this._onGRSelectForDisplayMatched, this);
			oRouter.getRoute("grx1").attachPatternMatched(this._onGREditMatched, this);
			oRouter.getRoute("grx0").attachPatternMatched(this._onGRSelectForEditMatched, this);
		},

		/**
		 * Handles pattern matched event for GR selection in display mode
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @private
		 */
		_onGRSelectForDisplayMatched: function (oEvent) {
			this._handleGRSelection(false);
		},

		/**
		 * Handles pattern matched event for GR display
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @private
		 */
		_onGRDisplayMatched: function (oEvent) {
			this._resetView();
			this.getModel("viewModel").setProperty("/editMode", false);

			var sObjectId = oEvent.getParameter("arguments").objectId;

			this.getModel().metadataLoaded().then(function () {
				this._bindView(sObjectId);
			}.bind(this));
		},

		/**
		 * Handles pattern matched event for GR selection in edit mode
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @private
		 */
		_onGRSelectForEditMatched: function (oEvent) {
			this._handleGRSelection(true);
		},

		/**
		 * Handles pattern matched event for GR edit
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @private
		 */
		_onGREditMatched: function (oEvent) {
			this._resetView();
			this.getModel("viewModel").setProperty("/editMode", true);

			var sObjectId = oEvent.getParameter("arguments").objectId;

			this.getModel().metadataLoaded().then(function () {
				this._bindView(sObjectId);
			}.bind(this));
		},

		/* =========================================================== */
		/* Event Handlers                                              */
		/* =========================================================== */

		/**
		 * Handles submit confirmation with warning dialog
		 * @public
		 */
		onSubmitConfirm: function () {
			MessageBox.warning(this.getResourceBundle().getText("grCancelConfirmText"), {
				title: this.getResourceBundle().getText("grCancelConfirmTitle"),
				initialFocus: null,
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.OK) {
						this.onSubmit();
					}
				}.bind(this)
			});
		},

		/**
		 * Handles submit action: validates and submits data to the backend
		 * @public
		 */
		onSubmit: function () {
			var oViewModel = this.getModel("viewModel");

			// Reset all errors
			sap.ui.getCore().getMessageManager().removeAllMessages();

			// Prepare submission data
			var oSubmissionData = this._prepareSubmissionData();

			// Show busy indicator
			oViewModel.setProperty("/busy", true);

			// Submit to backend
			this._submitGRCancellation(oSubmissionData);
		},

		/**
		 * Handles cancel action
		 * @public
		 */
		onCancel: function () {
			this.getRouter().navTo("grx1", {
				objectId: this.getModel("viewModel").getProperty("/objectId")
			}, false);
		},

		/**
		 * Handles more button press to display action sheet
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onMorePress: function (oEvent) {
			if (!this._actionSheet) {
				this._actionSheet = sap.ui.xmlfragment(
					this.getView().getId(),
					"defence.finance.finux.gr.view.GRMoreActionSheet",
					this
				);
				this.getView().addDependent(this._actionSheet);
			}

			if (this._actionSheet.isOpen()) {
				this._actionSheet.close();
			} else {
				this._actionSheet.openBy(oEvent.getSource());
			}
		},

		/**
		 * Handles item selection change in the table
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onItemSelectionChanged: function (oEvent) {
			var oTable = oEvent.getSource();
			var aSelectedItems = oTable.getSelectedItems();
			var bHasSelection = aSelectedItems.length > 0;

			this.getModel("viewModel").setProperty("/hasSelection", bHasSelection);
		},

		/* =========================================================== */
		/* GR Select Dialog Handlers                                   */
		/* =========================================================== */

		/**
		 * Handles GR selection dialog OK button press
		 * @public
		 */
		onGRSelectOK: function () {
			var oViewModel = this.getModel("viewModel");
			var sGrNumber = oViewModel.getProperty("/grSelectInput");

			if (sGrNumber === "") {
				MessageBox.error(this.getResourceBundle().getText("grBlankErrorText"));
				return;
			}

			var sPath = oViewModel.getProperty("/editMode") ? "grx1" : "gr1";

			this.getRouter().navTo(sPath, {
				objectId: sGrNumber
			}, false);

			this.getGRSelectDialog().close();
		},

		/**
		 * Handles GR selection dialog cancel button press
		 * @public
		 */
		onGRSelectCancel: function () {
			this.onNavHome();
		},

		/**
		 * Gets or creates the GR selection dialog
		 * @returns {sap.m.Dialog} The GR selection dialog
		 * @public
		 */
		getGRSelectDialog: function () {
			if (!this.oGRSelectDialog) {
				this.oGRSelectDialog = sap.ui.xmlfragment(
					"defence.finance.finux.gr.view.GRSelectDialog",
					this
				);
				this.getView().addDependent(this.oGRSelectDialog);
				syncStyleClass(
					this.getOwnerComponent().getContentDensityClass(),
					this.getView(),
					this.oGRSelectDialog
				);
			}
			return this.oGRSelectDialog;
		},

		/* =========================================================== */
		/* Navigation Methods                                          */
		/* =========================================================== */

		/**
		 * Event handler for navigating to landing page
		 * @public
		 */
		onNavHome: function () {
			try {
				var bFLP = this.getModel("componentModel").getProperty("/inFLP");

				if (bFLP === true && sap.ushell && sap.ushell.Container) {
					this._navigateViaFLP();
				} else {
					this._navigateDirectly();
				}
			} catch (oError) {
				// Fallback navigation if FLP services are not available
				jQuery.sap.log.error("Navigation error", oError);
				this._navigateDirectly();
			}
		},

		/**
		 * Navigates using FLP cross-app navigation
		 * @private
		 */
		_navigateViaFLP: function () {
			var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (window.history.length > 1) {
				oCrossAppNav.historyBack();
			} else {
				oCrossAppNav.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},

		/**
		 * Navigates directly to FLP home
		 * @private
		 */
		_navigateDirectly: function () {
			window.location.replace("../../../ui2/flp#Shell-home");
		},

		/**
		 * Handles navigation when no GR is found
		 * @public
		 */
		onNoGR: function () {
			var oViewModel = this.getModel("viewModel");

			// Unbind element to prevent re-triggering
			this.getView().unbindElement();

			// Clear all state
			oViewModel.setProperty("/bound", false);
			oViewModel.setProperty("/selected", false);
			oViewModel.setProperty("/busy", false);

			// Navigate to selection screen
			var sPath = oViewModel.getProperty("/editMode") ? "grx0" : "gr0";
			this.getRouter().navTo(sPath, {}, true);
		},

		/* =========================================================== */
		/* Value Help Methods                                          */
		/* =========================================================== */

		/**
		 * Handles GR value help request
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onGRValueHelpRequested: function (oEvent) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", true);

			var oResourceBundle = this.getResourceBundle();

			// Define column types
			var oDType = new sap.ui.model.type.Date({ pattern: "dd.MM.yyyy" });
			var oNType = new sap.ui.model.type.Float();

			// Create column model
			var oColModel = new JSONModel();
			oColModel.setData({
				cols: [
					{
						label: oResourceBundle.getText("vhGR"),
						template: "MatDoc"
					},
					{
						label: oResourceBundle.getText("vhPO"),
						template: "PoNumber"
					},
					{
						label: oResourceBundle.getText("vhVendorName"),
						template: "VendorName"
					},
					{
						label: oResourceBundle.getText("vhHeaderTxt"),
						template: "HeaderTxt"
					},
					{
						label: oResourceBundle.getText("vhRefDocNo"),
						template: "RefDocNo"
					},
					{
						label: oResourceBundle.getText("vhDocDate"),
						template: "DocDate",
						oType: oDType
					},
					{
						label: oResourceBundle.getText("vhQty"),
						template: "EntryQnt",
						oType: oNType
					}
				]
			});

			// Create value help dialog if it does not exist
			if (!this.oValueHelpDialog) {
				this._createValueHelpDialog(oColModel, oResourceBundle);
			}

			// Reset and open dialog
			this.oValueHelpDialog.getTable().setNoData(oResourceBundle.getText("vhNoData1"));
			this.oValueHelpDialog.setTokens([]);
			this.oValueHelpDialog.open();

			oViewModel.setProperty("/busy", false);
		},

		/**
		 * Creates the value help dialog
		 * @param {sap.ui.model.json.JSONModel} oColModel - Column model
		 * @param {sap.ui.model.resource.ResourceModel} oResourceBundle - Resource bundle
		 * @private
		 */
		_createValueHelpDialog: function (oColModel, oResourceBundle) {
			this.oValueHelpDialog = sap.ui.xmlfragment(
				"defence.finance.finux.gr.view.GRValueHelp",
				this
			);
			syncStyleClass("sapUiSizeCompact", this.getView(), this.oValueHelpDialog);
			this.getView().addDependent(this.oValueHelpDialog);

			// Attach keyboard event for Enter key search
			this.oValueHelpDialog.attachBrowserEvent("keydown", function (oEvent) {
				if (oEvent.keyCode === KeyCodes.ENTER) {
					oEvent.stopImmediatePropagation();
					oEvent.preventDefault();
					this.oValueHelpDialog.getFilterBar().search();
				}
			}.bind(this));

			// Configure table
			this.oValueHelpDialog.getTableAsync().then(function (oTable) {
				oTable.setModel(this.getOwnerComponent().getModel());
				oTable.setModel(oColModel, "columns");
				if (oTable.bindRows) {
					oTable.bindRows("/GoodsReceiptLookups");
				}
				oTable.setBusyIndicatorDelay(1);
				oTable.setEnableBusyIndicator(true);
				this.oValueHelpDialog.update();
			}.bind(this));

			this.oValueHelpDialog._sTableTitleNoCount = oResourceBundle.getText("vhTableTitle");

			// Hide 'Hide Advanced Search' button
			var oFilterBar = this.oValueHelpDialog.getFilterBar();
			oFilterBar._oHideShowButton.setVisible(false);
		},

		/**
		 * Handles GR value help OK button press
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onGRValueHelpOkPress: function (oEvent) {
			var oToken = oEvent.getParameter("tokens")[0];
			this.getModel("viewModel").setProperty("/grSelectInput", oToken.getKey());
			this.oValueHelpDialog.close();
		},

		/**
		 * Handles GR value help cancel button press
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onGRValueHelpCancelPress: function (oEvent) {
			this.oValueHelpDialog.close();
		},

		/**
		 * Handles GR value help after close event
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onGRValueHelpAfterClose: function (oEvent) {
			// Intentionally left empty - placeholder for future logic
		},

		/**
		 * Converts date string to Date object
		 * @param {string} sDate - Date string in dd.MM.yyyy format
		 * @returns {Date} Date object
		 * @public
		 */
		getDateValue: function (sDate) {
			return new Date(
				sDate.substr(6, 4),
				sDate.substr(3, 2) - 1,
				sDate.substr(0, 2)
			);
		},

		/**
		 * Handles filter bar search in value help dialog
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @public
		 */
		onGRFilterBarSearch: function (oEvent) {
			var aSelectionSet = oEvent.getParameter("selectionSet");
			var aFilters = this._buildFilters(aSelectionSet);

			var oFilter = new Filter({
				filters: aFilters,
				and: true
			});

			var oBinding = this.oValueHelpDialog.getTable().getBinding("rows");

			this.oValueHelpDialog.getTable().setNoData(
				this.getResourceBundle().getText("vhNoData2")
			);

			if (aFilters.length > 0) {
				oBinding.filter(oFilter);
			} else {
				MessageBox.error(this.getResourceBundle().getText("vhNoParameter"));
			}
		},

		/**
		 * Builds filters from selection set
		 * @param {array} aSelectionSet - Selection set from filter bar
		 * @returns {array} Array of filters
		 * @private
		 */
		_buildFilters: function (aSelectionSet) {
			return aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					if (oControl.getName() === "DocDate") {
						var sDate = oControl.getValue();
						var sDate1 = this.getDateValue(sDate.substring(0, 10));
						var sDate2 = this.getDateValue(sDate.substring(sDate.length - 10));

						aResult.push(new Filter({
							path: "DocDate",
							operator: FilterOperator.BT,
							value1: sDate1,
							value2: sDate2
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
			}.bind(this), []);
		},

		/* =========================================================== */
		/* Helper Methods - View Binding                               */
		/* =========================================================== */

		/**
		 * Handles GR selection dialog display
		 * @param {boolean} bEditMode - Whether the dialog is opened in edit mode
		 * @private
		 */
		_handleGRSelection: function (bEditMode) {
			this._resetView();
			this.getModel("viewModel").setProperty("/editMode", bEditMode);

			this.getModel().metadataLoaded().then(function () {
				this.getGRSelectDialog().open();
			}.bind(this));
		},

		/**
		 * Binds the view to the specified object ID
		 * @param {string} sObjectId - The object ID to bind
		 * @private
		 */
		_bindView: function (sObjectId) {
			var oParsedId = this._parseObjectId(sObjectId);
			var oModel = this.getOwnerComponent().getModel();

			var sObjectPath = oModel.createKey("/GoodsReceipts", {
				MatDoc: oParsedId.matDoc,
				DocYear: oParsedId.docYear
			});

			this._bindElement(sObjectPath);
		},

		/**
		 * Parses the object ID into material document and year
		 * @param {string} sObjectId - The object ID to parse
		 * @returns {object} Object containing matDoc and docYear
		 * @private
		 */
		_parseObjectId: function (sObjectId) {
			var sMatDoc = "";
			var sDocYear = "";

			if (sObjectId.length >= this._FULL_OBJECT_ID_LENGTH) {
				sMatDoc = sObjectId.substring(0, this._MAT_DOC_LENGTH);
				sDocYear = sObjectId.substring(
					this._MAT_DOC_LENGTH,
					this._FULL_OBJECT_ID_LENGTH
				);
			} else if (sObjectId.length >= this._MAT_DOC_LENGTH) {
				sMatDoc = sObjectId.substring(0, this._MAT_DOC_LENGTH);
			}

			return {
				matDoc: sMatDoc,
				docYear: sDocYear
			};
		},

		/**
		 * Binds the view element to the specified path
		 * @param {string} sObjectPath - The object path to bind
		 * @private
		 */
		_bindElement: function (sObjectPath) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", true);

			var bDataRequested = false;

			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "Items,MaterialDocuments"
				},
				events: {
					change: function (oEvent) {
						oViewModel.setProperty("/busy", false);
						if (!bDataRequested) {
							var oContextBinding = oEvent.getSource();
							oContextBinding.refresh(false);
						}
					},
					dataRequested: function (oEvent) {
						oViewModel.setProperty("/bound", false);
						bDataRequested = true;
					},
					dataReceived: this._onDataReceived.bind(this)
				}
			});
		},

		/**
		 * Handles data received event
		 * @param {sap.ui.base.Event} oEvent - The event object
		 * @private
		 */
		_onDataReceived: function (oEvent) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", false);

			var oGR = oEvent.getParameters("data").data;
			var validationResult = this._validateGRData(oGR);

			if (!validationResult.isValid) {
				this._showErrorAndNavigate(
					validationResult.errorKey,
					validationResult.isFormatted
				);
				return;
			}

			this._processValidGRData(oGR);
		},

		/* =========================================================== */
		/* Helper Methods - Validation                                 */
		/* =========================================================== */

		/**
		 * Validates GR data from the backend
		 * @param {object} oGR - The GR data object
		 * @returns {object} Object with isValid flag, errorKey, and isFormatted flag
		 * @private
		 */
		_validateGRData: function (oGR) {
			var oViewModel = this.getModel("viewModel");
			var bEditMode = oViewModel.getProperty("/editMode");

			if (!oGR || oGR.MatDoc === "") {
				return {
					isValid: false,
					errorKey: "grNotFoundErrorText",
					isFormatted: false
				};
			}

			if (bEditMode && oGR.Items && oGR.Items[0] &&
				Number(oGR.Items[0].EntryQnt) < 0) {
				return {
					isValid: false,
					errorKey: "grCancelCancellation",
					isFormatted: true
				};
			}

			if (oGR.MatDoc === "_") {
				return {
					isValid: false,
					errorKey: bEditMode ? "grNotStandardPo" : "grNotStandardPoDisplay",
					isFormatted: false
				};
			}

			return { isValid: true };
		},

		/* =========================================================== */
		/* Helper Methods - Data Processing                            */
		/* =========================================================== */

		/**
		 * Processes valid GR data
		 * @param {object} oGR - The GR data object
		 * @private
		 */
		_processValidGRData: function (oGR) {
			var oViewModel = this.getModel("viewModel");
			var bEditMode = oViewModel.getProperty("/editMode");

			// Filter items based on cancellation status
			var aItems = oGR.Items.filter(function (oItem) {
				return oItem.CancellationBlocked !== true && oItem.Reversed !== true;
			});

			// Apply filter in edit mode
			if (bEditMode) {
				oGR.Items = aItems;
			}

			// Check if there are items available for edit
			if (bEditMode && aItems.length === 0) {
				this._showNoLinesError();
				return;
			}

			// Set item model
			var oItemModel = new JSONModel();
			oItemModel.setData(oGR.Items);
			this.setModel(oItemModel, "itemModel");

			// Update view model
			oViewModel.setProperty("/canBeCancelled", aItems.length !== 0 && !bEditMode);
			oViewModel.setProperty("/bound", true);
			oViewModel.setProperty("/objectId", oGR.MatDoc + oGR.DocYear);

			// Clear messages
			sap.ui.getCore().getMessageManager().removeAllMessages();
		},

		/**
		 * Shows error when no lines are available for cancellation
		 * @private
		 */
		_showNoLinesError: function () {
			var sText = this.getResourceBundle().getText("grNoLines");
			var oFormattedText = new FormattedText("", { htmlText: sText });

			MessageBox.error(oFormattedText, {
				title: this.getResourceBundle().getText("errorTitle"),
				initialFocus: null,
				onClose: function () {
					this.onNoGR();
				}.bind(this)
			});
		},

		/**
		 * Shows error message and navigates away
		 * @param {string} sMessageKey - i18n key for the error message
		 * @param {boolean} bFormatted - Whether to use FormattedText
		 * @private
		 */
		_showErrorAndNavigate: function (sMessageKey, bFormatted) {
			var sText = this.getResourceBundle().getText(sMessageKey);
			var oMessage = bFormatted ?
				new FormattedText("", { htmlText: sText }) :
				sText;

			MessageBox.error(oMessage, {
				title: this.getResourceBundle().getText("errorTitle"),
				initialFocus: null,
				onClose: function () {
					this.onNoGR();
				}.bind(this)
			});
		},

		/**
		 * Resets the view to initial state
		 * @private
		 */
		_resetView: function () {
			// Unbind view
			this.getView().unbindElement();

			// Reset item model
			this.setModel(new JSONModel({}), "itemModel");

			// Setup the view model with default values
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				grSelectInput: "",
				objectId: "",
				bound: false,
				editMode: false,
				canBeCancelled: true,
				hasSelection: true,
				cancelReason: "",
				messageButtonType: "Ghost",
				messageButtonIcon: "sap-icon://warning2"
			});

			this.setModel(oViewModel, "viewModel");
		},

		/* =========================================================== */
		/* Helper Methods - Submission                                 */
		/* =========================================================== */

		/**
		 * Prepares submission data
		 * @returns {object} Submission data object
		 * @private
		 */
		_prepareSubmissionData: function () {
			var oBindingContext = this.getView().getBindingContext();
			var oData = this.getModel().getObject(oBindingContext.getPath(), {
				expand: "Items,MaterialDocuments"
			});

			var oItemData = this.getModel("itemModel").oData;
			oData.Items = oItemData;
			oData.CancelReason = this.getModel("viewModel").getProperty("/cancelReason");

			return oData;
		},

		/**
		 * Submits GR cancellation to the backend
		 * @param {object} oData - The data to submit
		 * @private
		 */
		_submitGRCancellation: function (oData) {
			var oViewModel = this.getModel("viewModel");
			var oModel = this.getOwnerComponent().getModel();

			oModel.create("/GoodsReceipts", oData, {
				success: this._handleSubmissionSuccess.bind(this),
				error: function (oError) {
					oViewModel.setProperty("/busy", false);
				}
			});
		},

		/**
		 * Handles successful submission
		 * @param {object} oResult - The result from the backend
		 * @param {object} oResponse - The response object
		 * @private
		 */
		_handleSubmissionSuccess: function (oResult, oResponse) {
			var oViewModel = this.getModel("viewModel");
			oViewModel.setProperty("/busy", false);

			var bError = this._checkForErrors();

			// Update item model with results
			var oItemModel = new JSONModel();
			oItemModel.setData(oResult.Items.results);
			this.setModel(oItemModel, "itemModel");

			if (bError) {
				// Show message popover if there are errors
				var oButton = this.byId("messagesButton");
				oButton.firePress(oButton);
			} else {
				// Show success dialog with rating
				this._showSuccessDialog(oResult);
			}
		},

		/**
		 * Checks for errors in messages
		 * @returns {boolean} True if errors exist
		 * @private
		 */
		_checkForErrors: function () {
			var aMessage = this.getModel("message").oData;
			for (var i = 0; i < aMessage.length; i++) {
				if (aMessage[i].type === "Error") {
					return true;
				}
			}
			return false;
		},

		/**
		 * Shows success dialog with rating
		 * @param {object} oResult - The result from the backend
		 * @private
		 */
		_showSuccessDialog: function (oResult) {
			var sText = this._buildSuccessMessage(oResult);
			var oRating = this._createRatingObject(oResult);
			var oRateModel = new JSONModel(oRating);

			var dialog = this._createSuccessDialog(sText, oRating);

			dialog.addStyleClass("sapUiSizeCompact");
			dialog.setModel(oRateModel);
			dialog.open();
		},

		/**
		 * Builds success message text
		 * @param {object} oResult - The result from the backend
		 * @returns {string} Success message HTML
		 * @private
		 */
		_buildSuccessMessage: function (oResult) {
			var sText = this.getResourceBundle().getText(
				"grCancelSuccessText1",
				[oResult.MatDoc, oResult.PoNumber]
			);

			for (var i = 0; i < oResult.MaterialDocuments.results.length; i++) {
				sText += "<br>" + this.getResourceBundle().getText(
					"grCancelSuccessText2",
					[oResult.MaterialDocuments.results[i].MatDoc]
				);
			}

			return sText;
		},

		/**
		 * Creates rating object for feedback
		 * @param {object} oResult - The result from the backend
		 * @returns {object} Rating object
		 * @private
		 */
		_createRatingObject: function (oResult) {
			var oRating = this.getModel("common").createEntry("/FeedbackRatings").getObject();
			oRating.Rating = 0;
			oRating.Comments = "";
			oRating.SourceObj = "GR";
			oRating.SourceKey = oResult.MaterialDocuments.results[0].MatDoc;
			delete oRating.__metadata;

			return oRating;
		},

		/**
		 * Creates success dialog
		 * @param {string} sText - Success message HTML
		 * @param {object} oRating - Rating object
		 * @returns {sap.m.Dialog} Success dialog
		 * @private
		 */
		_createSuccessDialog: function (sText, oRating) {
			return new sap.m.Dialog({
				title: "Success",
				type: "Message",
				state: "Success",
				busyIndicatorDelay: 0,
				content: [
					new sap.m.VBox({
						items: [
							new FormattedText("", { htmlText: sText }),
							new sap.m.Label({ text: "" }),
							new sap.m.Label({
								text: this.getResourceBundle().getText("ratingLabel")
							}),
							new sap.m.RatingIndicator({
								maxValue: 5,
								value: "{/Rating}",
								visualMode: sap.m.RatingIndicatorVisualMode.Full
							}),
							new sap.m.Label({
								text: this.getResourceBundle().getText("feedbackLabel")
							}),
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
						var oUpdatedRating = oEvent1.getSource().getModel().getData();

						// Save rating if provided (fire-and-forget)
						if (oUpdatedRating.Rating || oUpdatedRating.Comments) {
							oUpdatedRating.Rating = oUpdatedRating.Rating ?
								oUpdatedRating.Rating.toString() : "";

							this.getModel("common").create("/FeedbackRatings", oUpdatedRating, {
								error: function (oError) {
									// Log error but do not block navigation
									jQuery.sap.log.error("Failed to save feedback rating", oError);
								}
							});
						}

						// Close dialog and navigate
						oEvent1.getSource().getParent().close();
						this.onNavHome();
					}.bind(this)
				}),
				afterClose: function () {
					this.destroy();
				}
			});
		}

	});
});
