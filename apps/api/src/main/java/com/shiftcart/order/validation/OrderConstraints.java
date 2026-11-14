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
    public static final String ADDRESS_EMPTY = "Ton adresse permet au livreur de te trouver.";
    public static final String ADDRESS_SHORT = "Précise ta rue, ton quartier et ta ville.";
    public static final String ADDRESS_LONG = "Ton adresse est trop longue (200 caractères max).";
    public static final int ADDRESS_MIN = 10;
    public static final int ADDRESS_MAX = 200;

    private OrderConstraints() {}

    /**
     * Adresse telle qu'elle est validée ET enregistrée : caractères de contrôle (retours à la ligne, tabulations,
     * NUL…) → espace, espaces multiples réduits, trim. Valider la forme enregistrée évite qu'une adresse
     * « longue » seulement grâce à des espaces soit stockée sous 10 caractères.
     */
    public static String normalizeAddress(String value) {
        return value == null ? null : value.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
    }

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

    /** Adresse exacte : 10 à 200 caractères après trim (docs/CONTRACT.md › v2). */
    @Documented
    @Constraint(validatedBy = AddressValidator.class)
    @Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
    @Retention(RetentionPolicy.RUNTIME)
    public @interface Address {
        String message() default ADDRESS_EMPTY;

        Class<?>[] groups() default {};

        Class<? extends Payload>[] payload() default {};
    }

    public static class AddressValidator implements ConstraintValidator<Address, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext ctx) {
            String trimmed = value == null ? "" : normalizeAddress(value);
            String error = trimmed.isEmpty() ? ADDRESS_EMPTY
                    : trimmed.length() < ADDRESS_MIN ? ADDRESS_SHORT
                    : trimmed.length() > ADDRESS_MAX ? ADDRESS_LONG : null;
            return report(ctx, error);
        }
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
