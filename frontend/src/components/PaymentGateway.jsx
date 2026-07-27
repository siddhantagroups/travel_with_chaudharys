import React, { useState } from 'react';
import { X, CreditCard, Wallet, Smartphone, ShieldCheck, CheckCircle2, Ticket } from 'lucide-react';

export default function PaymentGateway({ bookingInfo, onClose, onPaymentSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'upi'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txnId, setTxnId] = useState('');
  
  // Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const routePrice = bookingInfo.route.price;
  const numSeats = bookingInfo.seatNumbers.length;
  const totalAmount = routePrice * numSeats;

  const handlePayment = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate 2 seconds processing
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      const generatedTxn = 'pay_TWC' + Math.random().toString(36).substring(2, 11).toUpperCase();
      setTxnId(generatedTxn);
    }, 2000);
  };

  const handleFinish = () => {
    onPaymentSuccess({
      paymentId: txnId,
      amountPaid: totalAmount,
      paymentStatus: 'Paid'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-fade-in">
        
        {/* Header */}
        <div className="bg-brand-navy p-6 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-2">
            <Ticket className="text-brand-steel rotate-45" size={24} />
            <span className="text-lg font-bold">Secure Ticket Checkout</span>
          </div>
          {!success && (
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        {!success ? (
          <div className="p-6">
            
            {/* Booking Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 text-sm">
              <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-wider text-xs">Journey Details</h4>
              <div className="grid grid-cols-2 gap-y-2 text-slate-600 font-semibold">
                <div>Route:</div>
                <div className="text-right text-brand-navy font-bold">{bookingInfo.route.departure} → {bookingInfo.route.destination}</div>
                
                <div>Departure Time:</div>
                <div className="text-right text-slate-800">{bookingInfo.route.departureTime}</div>
                
                <div>Travel Date:</div>
                <div className="text-right text-slate-800">{bookingInfo.date}</div>

                <div>Bus Plate Number:</div>
                <div className="text-right text-slate-800 font-mono">{bookingInfo.route.vehicle.plateNumber}</div>

                <div>Selected Seats:</div>
                <div className="text-right text-slate-800 font-bold">{bookingInfo.seatNumbers.join(', ')}</div>

                <div className="pt-2 border-t border-slate-200 font-bold text-slate-800">Total Price:</div>
                <div className="pt-2 border-t border-slate-200 text-right text-brand-steel text-lg font-extrabold">
                  ₹{totalAmount}
                </div>
              </div>
            </div>

            {/* Payment Mode Selector Tabs */}
            <div className="flex border border-slate-200 rounded-xl overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all ${
                  paymentMethod === 'card' 
                    ? 'bg-brand-steel text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={16} />
                <span>Card Payment</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all ${
                  paymentMethod === 'upi' 
                    ? 'bg-brand-steel text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone size={16} />
                <span>UPI Scan & Pay</span>
              </button>
            </div>

            {/* Forms */}
            {paymentMethod === 'card' ? (
              
              /* CARD FORM */
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength="16"
                    placeholder="1234 5678 1234 5678"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength="5"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">CVV</label>
                    <input
                      type="password"
                      required
                      maxLength="3"
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-steel text-center font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-6 rounded-xl bg-brand-steel hover:bg-brand-navy text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Pay ₹{totalAmount}</span>
                  )}
                </button>
              </form>
            ) : (
              
              /* UPI MOCK SCANNER */
              <div className="text-center space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl inline-block border border-slate-200">
                  {/* Generated simulated QR code container */}
                  <div className="w-40 h-40 bg-slate-800 flex flex-col items-center justify-center mx-auto text-white p-2 rounded-xl relative border border-slate-700">
                    <div className="grid grid-cols-3 gap-2 w-full h-full opacity-90 p-2">
                      <div className="bg-white rounded"></div>
                      <div className="bg-white rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-white rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-white rounded"></div>
                      <div className="bg-white rounded"></div>
                      <div className="bg-slate-800 rounded"></div>
                      <div className="bg-white rounded"></div>
                    </div>
                    <span className="absolute text-[10px] font-bold bg-brand-steel text-white px-2 py-0.5 rounded shadow">UPI SCANNER</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                  Scan this QR code using any UPI app (GooglePay, PhonePe, Paytm) to complete payment.
                </p>
                
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full py-4 mt-6 rounded-xl bg-brand-steel hover:bg-brand-navy text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Simulate UPI Payment Success</span>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-6 font-semibold">
              <ShieldCheck size={14} className="text-slate-400" />
              <span>PCI-DSS Compliant Encryption Layer</span>
            </div>

          </div>
        ) : (
          
          /* SUCCESS SCREEN */
          <div className="p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={40} className="animate-bounce" />
            </div>
            
            <div>
              <h3 className="text-2xl font-extrabold text-brand-navy">Payment Successful!</h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">Your bus seat booking is confirmed.</p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-bold text-slate-700 font-mono">{txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Passenger:</span>
                <span className="font-bold text-slate-700">{bookingInfo.passengerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bus Plate No:</span>
                <span className="font-bold text-brand-navy font-mono">{bookingInfo.route.vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Seats Assigned:</span>
                <span className="font-bold text-brand-steel font-mono">{bookingInfo.seatNumbers.join(', ')}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-100 pt-2 font-bold">
                <span className="text-slate-700">Amount Paid:</span>
                <span className="text-emerald-700 text-base">₹{totalAmount}</span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-4 rounded-xl bg-brand-navy hover:bg-brand-steel text-white font-bold text-sm transition-all shadow-md"
            >
              Close & View Ticket
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
