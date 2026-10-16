package de.gassi.service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

public final class BildSkalierer {

    private BildSkalierer() {
    }

    public static AvatarService.Bild skalieren(byte[] original, String contentType, int maxKante) {
        BufferedImage quelle;
        try {
            quelle = ImageIO.read(new ByteArrayInputStream(original));
        } catch (Exception e) {
            quelle = null;
        }
        if (quelle == null) {
            return new AvatarService.Bild(original, contentType);
        }

        int breite = quelle.getWidth();
        int hoehe = quelle.getHeight();
        double skala = Math.min(1.0, Math.min((double) maxKante / breite, (double) maxKante / hoehe));
        if (skala >= 1.0 && "image/jpeg".equals(contentType)) {
            return new AvatarService.Bild(original, contentType);
        }

        int neuBreite = Math.max(1, (int) Math.round(breite * skala));
        int neuHoehe = Math.max(1, (int) Math.round(hoehe * skala));
        BufferedImage ziel = new BufferedImage(neuBreite, neuHoehe, BufferedImage.TYPE_INT_RGB);
        Graphics2D grafik = ziel.createGraphics();
        grafik.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        grafik.setColor(Color.WHITE);
        grafik.fillRect(0, 0, neuBreite, neuHoehe);
        grafik.drawImage(quelle, 0, 0, neuBreite, neuHoehe, null);
        grafik.dispose();

        ByteArrayOutputStream puffer = new ByteArrayOutputStream();
        try {
            ImageIO.write(ziel, "jpg", puffer);
        } catch (IOException e) {
            return new AvatarService.Bild(original, contentType);
        }
        return new AvatarService.Bild(puffer.toByteArray(), "image/jpeg");
    }
}
