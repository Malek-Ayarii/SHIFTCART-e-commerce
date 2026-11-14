package com.shiftcart.order.validation;

import com.shiftcart.common.Governorates;
import com.shiftcart.common.phone.TnPhone;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Contraintes Bean Validation du checkout, avec les messages exacts de docs/API.md
 * (identiques à la validation côté boutique).
 */
public final class OrderConstraints {

    public static final String NAME_EMPTY = "Ton nom aide le livreur à te trouver.";
    public static final String NAME_INVALID = "Écris ton nom et ton prénom.";

    private OrderConstraints() {}

    /** Nom & prénom : 3 à 80 caractères après trim. */
    @Documented
    @Constraint(validatedBy = CustomerNameValidator.class)
    @Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
    @Retention(RetentionPolicy.RUNTIME)
    public @interface CustomerName {
        String message() default NAME_INVALID;

        Class<?>[] groups() default {};

        Class<? extends Payload>[] payload() default {};
    }

    /** Téléphone : 8 chiffres après suppression des espaces, premier chiffre 2/3/4/5/7/9. */
    @Documented
    @Constraint(validatedBy = TnPhoneValidator.class)
    @Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
    @Retention(RetentionPolicy.RUNTIME)
    public @interface TnPhoneNumber {
        String message() default TnPhone.MSG_EMPTY;

        Class<?>[] groups() default {};

        Class<? extends Payload>[] payload() default {};
    }

    /** Gouvernorat : un des 24, accents exacts. */
    @Documented
    @Constraint(validatedBy = GovernorateValidator.class)
    @Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Governorate {
        String message() default Governorates.MSG_REQUIRED;

        Class<?>[] groups() default {};

        Class<? extends Payload>[] payload() default {};
    }

    public static class CustomerNameValidator implements ConstraintValidator<CustomerName, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext ctx) {
            String trimmed = value == null ? "" : value.trim();
            String error = trimmed.isEmpty() ? NAME_EMPTY
                    : (trimmed.length() < 3 || trimmed.length() > 80) ? NAME_INVALID : null;
            return report(ctx, error);
        }
    }

    public static class TnPhoneValidator implements ConstraintValidator<TnPhoneNumber, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext ctx) {
            return report(ctx, TnPhone.validate(value));
        }
    }

    public static class GovernorateValidator implements ConstraintValidator<Governorate, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext ctx) {
            return report(ctx, Governorates.isValid(value) ? null : Governorates.MSG_REQUIRED);
        }
    }

    private static boolean report(ConstraintValidatorContext ctx, String error) {
        if (error == null) {
            return true;
        }
        ctx.disableDefaultConstraintViolation();
        // Les messages ne contiennent ni '{' ni '$' : pas d'interpolation parasite.
        ctx.buildConstraintViolationWithTemplate(error).addConstraintViolation();
        return false;
    }
}
