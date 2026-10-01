import { slugError } from '@/config/productSlugs';
import styles from '@/styles/Admin.module.scss';

export type LandingFormValues = {
  slug: string;
  garmentWord: string;
  modelUrl: string;
  // printed marker width in centimeters; the api stores meters
  physicalWidthCm: string;
};

type LandingField = keyof LandingFormValues;

export function landingErrors(values: LandingFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const slugProblem = slugError(values.slug.trim());
  if (slugProblem) errors.slug = slugProblem;
  const modelUrl = values.modelUrl.trim();
  if (modelUrl && !/^https:\/\/\S+\.(glb|gltf)(\?\S*)?$/i.test(modelUrl)) {
    errors.modelUrl = '3d model must be an https link to a .glb or .gltf file';
  }
  const width = values.physicalWidthCm.trim();
  if (width && !(Number(width) >= 2 && Number(width) <= 500)) {
    errors.physicalWidthCm = 'marker width must be between 2 and 500 cm';
  }
  return errors;
}

// empty strings clear a field on update; undefined leaves it out of a create request
export function landingPayload(values: LandingFormValues, forUpdate: boolean) {
  const clean = (value: string) => {
    const trimmed = value.trim();
    return trimmed || (forUpdate ? '' : undefined);
  };
  const width = values.physicalWidthCm.trim();
  return {
    slug: clean(values.slug),
    garmentWord: clean(values.garmentWord),
    modelUrl: clean(values.modelUrl),
    // null clears the width on update, like '' does for the text fields
    physicalWidthMeters: width ? Math.round(Number(width) * 10) / 1000 : forUpdate ? null : undefined,
  };
}

export const widthCmFromMeters = (meters?: number | null) => (meters ? String(Math.round(meters * 1000) / 10) : '');

interface LandingFieldsProps {
  values: LandingFormValues;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (field: LandingField, value: string) => void;
}

const hintStyle = { color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginTop: '4px' };
const errorStyle = { color: '#ff6b6b', fontSize: '0.8rem', marginTop: '4px' };

export default function LandingFields({ values, errors, disabled = false, onChange }: LandingFieldsProps) {
  const slug = values.slug.trim();

  return (
    <div className={styles.formSection}>
      <h3 className={styles.formSectionTitle}>landing page</h3>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', marginBottom: '16px' }}>
        with a slug, this product is live at its own page as soon as it&apos;s saved and has a compiled marker.
        no deploy needed. the description above is used as the page copy.
      </p>

      <div className={styles.formRow}>
        <div className={styles.formRowItem}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
            slug
          </label>
          <input
            type="text"
            value={values.slug}
            onChange={(e) => onChange('slug', e.target.value.toLowerCase())}
            className={`${styles.inputField} ${errors.slug ? styles.error : ''}`}
            placeholder="e.g., wmcyn-camo-tee"
            disabled={disabled}
          />
          {errors.slug ? (
            <div style={errorStyle}>{errors.slug}</div>
          ) : (
            <div style={hintStyle}>{slug ? `wmcyn.online/${slug}` : 'leave empty for no public page'}</div>
          )}
        </div>
        <div className={styles.formRowItem}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
            garment word
          </label>
          <input
            type="text"
            value={values.garmentWord}
            onChange={(e) => onChange('garmentWord', e.target.value)}
            className={styles.inputField}
            placeholder="e.g., shirt, hoodie, bag"
            disabled={disabled}
          />
          <div style={hintStyle}>used in &quot;point your camera at the ...&quot;</div>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formRowItem}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
            3d model url
          </label>
          <input
            type="url"
            value={values.modelUrl}
            onChange={(e) => onChange('modelUrl', e.target.value)}
            className={`${styles.inputField} ${errors.modelUrl ? styles.error : ''}`}
            placeholder="https://.../model.glb (optional)"
            disabled={disabled}
          />
          {errors.modelUrl ? (
            <div style={errorStyle}>{errors.modelUrl}</div>
          ) : (
            <div style={hintStyle}>leave empty to use the wmcyn 3d logo</div>
          )}
        </div>
        <div className={styles.formRowItem}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
            printed marker width (cm)
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={2}
            max={500}
            step={0.1}
            value={values.physicalWidthCm}
            onChange={(e) => onChange('physicalWidthCm', e.target.value)}
            className={`${styles.inputField} ${errors.physicalWidthCm ? styles.error : ''}`}
            placeholder="e.g., 24.5"
            disabled={disabled}
          />
          {errors.physicalWidthCm ? (
            <div style={errorStyle}>{errors.physicalWidthCm}</div>
          ) : (
            <div style={hintStyle}>measure the printed artwork; the ios app needs it to track this product in ar</div>
          )}
        </div>
      </div>
    </div>
  );
}
