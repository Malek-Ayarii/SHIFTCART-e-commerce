package com.nexoshift.order;

import com.nexoshift.common.config.CoreConfig;
import com.nexoshift.common.money.Money;
import com.nexoshift.common.phone.TnPhone;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.Image;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.Rectangle;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/**
 * Bon de livraison A5 (OpenPDF) : logo (si présent), réf, client, téléphone, gouvernorat, adresse exacte, pack,
 * montant à encaisser, transporteur. Sans code-barres. Document réservé à l'équipe (route admin).
 */
@Service
public class DeliverySlipService {

    private static final Logger log = LoggerFactory.getLogger(DeliverySlipService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRANCE)
            .withZone(CoreConfig.TUNIS);
    /** Encre et gris neutres du PDF imprimé (noir et blanc, pas d'orange : impression thermique/laser). */
    private static final Color INK = Color.BLACK;
    private static final Color MUTED = Color.DARK_GRAY;

    private final byte[] logo;

    public DeliverySlipService() {
        this.logo = loadLogo();
    }

    public byte[] render(CustomerOrder o) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A5, 36, 36, 36, 36);
        PdfWriter.getInstance(doc, out);
        doc.addTitle("Bon de livraison " + o.getRef());
        doc.addCreator("NEXO SHIFT");
        doc.open();

        Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, INK);
        Font label = FontFactory.getFont(FontFactory.HELVETICA, 9, MUTED);
        Font value = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, INK);
        Font big = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, INK);
        Font small = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);

        if (logo != null) {
            try {
                Image img = Image.getInstance(logo);
                img.scaleToFit(120, 40);
                img.setAlignment(Element.ALIGN_LEFT);
                doc.add(img);
            } catch (IOException e) {
                log.debug("Slip logo could not be rendered", e);
            }
        }

        Paragraph heading = new Paragraph("Bon de livraison", title);
        heading.setSpacingBefore(8);
        doc.add(heading);
        doc.add(new Paragraph("Commande " + o.getRef() + " · " + DATE.format(o.getCreatedAt()), label));

        PdfPTable table = new PdfPTable(new float[] {1f, 2f});
        table.setWidthPercentage(100);
        table.setSpacingBefore(14);
        row(table, "Client", o.getCustomerName(), label, value);
        row(table, "Téléphone", TnPhone.display(o.getPhoneE164()), label, value);
        row(table, "Gouvernorat", o.getGovernorate(), label, value);
        row(table, "Adresse", o.getAddress(), label, value);
        row(table, "Article", o.getProduct().getName() + " × " + o.getQuantity(), label, value);
        String carrier = Carriers.display(o.getCarrier() == null ? Carriers.DEFAULT : o.getCarrier());
        row(table, "Transporteur", carrier, label, value);
        if (o.getTrackingNumber() != null) {
            row(table, "N° de suivi", o.getTrackingNumber(), label, value);
        }
        doc.add(table);

        PdfPTable amount = new PdfPTable(1);
        amount.setWidthPercentage(100);
        amount.setSpacingBefore(18);
        PdfPCell box = new PdfPCell();
        box.setBorderWidth(2f);
        box.setBorderColor(INK);
        box.setPadding(12);
        box.addElement(new Paragraph("Montant à encaisser (paiement à la livraison)", label));
        box.addElement(new Paragraph(Money.formatTnd(o.getAmountMillimes()) + " TND", big));
        amount.addCell(box);
        doc.add(amount);

        Paragraph foot = new Paragraph();
        foot.setSpacingBefore(18);
        foot.add(new Chunk("Livraison gratuite pour le client. Vérifier le colis avec le client avant encaissement.",
                small));
        doc.add(foot);

        doc.close();
        return out.toByteArray();
    }

    private static void row(PdfPTable table, String k, String v, Font label, Font value) {
        PdfPCell kc = new PdfPCell(new Phrase(k, label));
        PdfPCell vc = new PdfPCell(new Phrase(v == null ? "" : v, value));
        for (PdfPCell c : new PdfPCell[] {kc, vc}) {
            c.setBorder(Rectangle.BOTTOM);
            c.setBorderColor(Color.LIGHT_GRAY);
            c.setPaddingTop(6);
            c.setPaddingBottom(6);
            table.addCell(c);
        }
    }

    private static byte[] loadLogo() {
        ClassPathResource res = new ClassPathResource("slip-logo.png");
        if (!res.exists()) {
            return null;
        }
        try (InputStream in = res.getInputStream()) {
            return in.readAllBytes();
        } catch (IOException e) {
            return null;
        }
    }
}
