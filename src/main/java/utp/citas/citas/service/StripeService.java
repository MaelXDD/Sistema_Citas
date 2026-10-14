package utp.citas.citas.service;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;

import java.math.BigDecimal;

public interface StripeService {

    PaymentIntent procesarPago(BigDecimal montoEnSoles, String paymentMethodId) throws StripeException;
}