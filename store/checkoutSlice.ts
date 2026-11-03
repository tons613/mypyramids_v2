import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NewOrderPatient = {
  firstname: string;
  lastname: string;
  phone: string;
  dob: string;
  email?: string;
  gender: string;
  role: 'patient';
};

export type OrderRecipient =
  | { type: 'self' }
  | { type: 'existing'; patient_id: number; patientName: string }
  | { type: 'new'; patient: NewOrderPatient; patientName: string };

type CheckoutState = { recipient: OrderRecipient | null };

const initialState: CheckoutState = { recipient: null };

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setOrderRecipient: (state, action: PayloadAction<OrderRecipient>) => {
      state.recipient = action.payload;
    },
    clearOrderRecipient: (state) => {
      state.recipient = null;
    },
  },
});

export const { setOrderRecipient, clearOrderRecipient } = checkoutSlice.actions;
export default checkoutSlice.reducer;
