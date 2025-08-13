const { core, orders } = require('@paypal/checkout-server-sdk');

function PayPalClient(clientId, clientSecret) {
  const environment = process.env.NODE_ENV === 'production'
    ? new core.LiveEnvironment(clientId, clientSecret)
    : new core.SandboxEnvironment(clientId, clientSecret);
  
  this.client = () => new core.PayPalHttpClient(environment);
  this.orders = orders;
}

module.exports = { PayPalClient };