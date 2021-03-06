import computed from "ember-addons/ember-computed-decorators";
import { observes, on } from 'ember-addons/ember-computed-decorators';
import { ajax } from 'discourse/lib/ajax';
import loadScript from 'discourse/lib/load-script';
import Payment from '../models/payment';

export default Ember.Component.extend({
    @computed('showBilling')
    showSubmitButton(showBilling){
        return showBilling === true ? 'hidden' : undefined;
    },

    @computed('showBilling')
    showContinueButton(showBilling){
        return showBilling === true ? true : false;
    },
    @computed('showStripe')
    showStripeButton(showStripe){
        return showStripe === true ? true : false;
    },

    @on('init')
    stripe(){
        this.set("showLoading", true);
        self = this;

        loadScript("https://js.stripe.com/v3/", {scriptTag: true}).then(() => {
            self.set("showLoading", false);
            var stripe = Stripe(Discourse.SiteSettings.memberships_stripe_publishable_key);
            var elements = stripe.elements();
            var style = {
                base: {
                    color: "grey",
                    lineHeight: "30px",
                    fontSmoothing: "antialiased",
                    fontSize: "1.2rem",
                    '::placeholder': {
                        color: "#CDCDCD"
                    }
                },
                invalid: {
                    color: "red"
                }
            }
            var card = elements.create('card', {style});
            card.mount('#card-element');

            card.addEventListener('change', function(event) {
                var displayError = document.getElementById('card-errors');
                if (event.error) {
                  displayError.textContent = event.error.message;
                } else {
                  displayError.textContent = '';
                }
              });

            var form = document.getElementById('payment-form');
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                
                stripe.createToken(card).then(function(result) {
                    if (result.error) {
                    // Inform the user if there was an error.
                    var errorElement = document.getElementById('card-errors');
                    errorElement.textContent = result.error.message;
                    } else {
                    // Send the token to your server.
                    self.submitStripe(result.token);
                    }
                });
            });
        });
    },
    submitStripe(params){
        let result = Payment.submitNonce(self.get('membershipsLevel')[0].id, params, this.get("update"));
        this.set('showLoading', true);
        result.then((response) => {
            this.set("showCompleted", true);
            this.set('checkoutState', 'completed');
            this.set('showStripe', false);
        }).catch(e => {
            if (e.jqXHR.responseJSON && e.jqXHR.responseJSON.errors) {
              bootbox.alert(I18n.t("generic_error_with_reason", {error: e.jqXHR.responseJSON.errors.join('. ')}));
            } else {
              bootbox.alert(I18n.t("generic_error"));
            }
            self.set('checkoutState', 'billing-payment');
            self.set('showVerify', false);
            self.set('showBilling', true);
            self.set('showLoading', false);
          });
    }  

      
});
