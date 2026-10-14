package utp.citas.citas.service.impl;

import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.stereotype.Service;
import utp.citas.citas.service.StripeService;

import java.math.BigDecimal;

@Service
public class StripeServiceImpl implements StripeService {

    @Override
    public PaymentIntent procesarPago(BigDecimal montoEnSoles, String paymentMethodId) throws StripeException {
        long montoEnCentimos = montoEnSoles.multiply(BigDecimal.valueOf(100)).longValueExact();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(montoEnCentimos)
                .setCurrency("pen")
                .setPaymentMethod(paymentMethodId)
                .setConfirm(true)
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .setAllowRedirects(PaymentIntentCreateParams.AutomaticPaymentMethods.AllowRedirects.NEVER)
                                .build()
                )
                .build();

        return PaymentIntent.create(params);
    }
}
