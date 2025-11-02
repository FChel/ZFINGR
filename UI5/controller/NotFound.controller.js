sap.ui.define([
	"./BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("defence.finance.finux.gr.controller.NotFound", {

		/**
		 * Navigates back when the link is pressed
		 * @public
		 */
		onLinkPressed : function () {
			this.onNavBack();
		}

	});

});