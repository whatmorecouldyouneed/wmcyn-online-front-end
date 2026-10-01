import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { listInstances, mintInstances, rotateInstanceSecret, voidInstance } from '@/lib/apiClient';
import type { AdminInstance, MintedInstance } from '@/types/instances';
import styles from '@/styles/Admin.module.scss';

type Props = { productSetId: string; productSetName: string };

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string));

function downloadCsv(name: string, items: MintedInstance[]) {
  const rows = [['publicId', 'editionNumber', 'publicUrl', 'claimUrl', 'claimCode'], ...items.map((item) => [
    item.publicId, item.editionNumber ?? '', item.publicUrl, item.claimUrl, item.claimCode,
  ])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-claim-codes.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// one sheet per batch: the outside code says what the item is, the inside code proves ownership
async function printSheet(name: string, items: MintedInstance[]) {
  const QRCode = (await import('qrcode')).default;
  const blocks = await Promise.all(items.map(async (item) => {
    const outside = await QRCode.toString(item.publicUrl, { type: 'svg', margin: 1, width: 140 });
    const inside = await QRCode.toString(item.claimUrl, { type: 'svg', margin: 1, width: 140 });
    const edition = item.editionNumber ? ` · no. ${item.editionNumber}` : '';
    return `<section><h2>${escapeHtml(name)}${edition}</h2>
      <div class="pair"><figure>${outside}<figcaption>outside · ${item.publicId}</figcaption></figure>
      <figure>${inside}<figcaption>inside · ${escapeHtml(item.claimCode)}</figcaption></figure></div></section>`;
  }));
  const sheet = window.open('', '_blank', 'noopener=no');
  if (!sheet) return;
  sheet.document.write(`<!doctype html><html><head><title>${escapeHtml(name)} claim codes</title><style>
    body{font-family:system-ui,sans-serif;margin:24px}p.warn{font-size:12px}
    section{break-inside:avoid;border:1px solid #ccc;border-radius:8px;padding:12px;margin-bottom:12px}
    h2{font-size:14px;margin:0 0 8px}.pair{display:flex;gap:24px}figure{margin:0;text-align:center}
    figcaption{font-family:ui-monospace,monospace;font-size:12px;margin-top:4px}
  </style></head><body><p class="warn">inside codes are secrets: anyone holding one can claim that item. keep this sheet private.</p>
  ${blocks.join('')}<script>window.onload=function(){window.print()}</script></body></html>`);
  sheet.document.close();
}

export default function InstanceMinter({ productSetId, productSetName }: Props) {
  const [count, setCount] = useState('10');
  const [editionSize, setEditionSize] = useState('');
  const [firstEdition, setFirstEdition] = useState('1');
  const [size, setSize] = useState('');
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState('');
  const [minted, setMinted] = useState<MintedInstance[]>([]);
  const [existing, setExisting] = useState<AdminInstance[]>([]);
  const [rotated, setRotated] = useState<{ publicId: string; claimCode: string; claimUrl: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { items } = await listInstances(productSetId);
      setExisting([...items].sort((a, b) => (a.editionNumber ?? 0) - (b.editionNumber ?? 0)));
    } catch (e: any) {
      setError(e?.message || 'could not load items');
    }
  }, [productSetId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mint = async () => {
    setMinting(true);
    setError('');
    try {
      const result = await mintInstances({
        productSetId,
        count: Number(count),
        ...(editionSize ? { editionSize: Number(editionSize), firstEditionNumber: Number(firstEdition || '1') } : {}),
        ...(size.trim() ? { size: size.trim() } : {}),
      });
      setMinted(result.instances);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'mint failed');
    } finally {
      setMinting(false);
    }
  };

  const voidItem = async (publicId: string) => {
    if (!window.confirm(`void ${publicId}? it can never be claimed again, and any current owner loses it.`)) return;
    try {
      await voidInstance(publicId);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'void failed');
    }
  };

  const newCode = async (publicId: string) => {
    if (!window.confirm(`issue a new claim code for ${publicId}? the printed code stops working.`)) return;
    try {
      const result = await rotateInstanceSecret(publicId);
      setRotated({ publicId, claimCode: result.claimCode, claimUrl: result.claimUrl });
    } catch (e: any) {
      setError(e?.message || 'could not issue a new code');
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '1.5rem' }}>physical items</h2>
      <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: '16px', fontSize: '0.9rem' }}>
        each minted item gets an outside code (shows what it is) and an inside claim code (proves ownership). claim codes are shown once.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        <label className={styles.formLabel}>how many
          <input className={styles.formInput} type="number" min={1} max={200} value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <label className={styles.formLabel}>edition size (optional)
          <input className={styles.formInput} type="number" min={1} value={editionSize} onChange={(e) => setEditionSize(e.target.value)} />
        </label>
        <label className={styles.formLabel}>first edition no.
          <input className={styles.formInput} type="number" min={1} value={firstEdition} disabled={!editionSize} onChange={(e) => setFirstEdition(e.target.value)} />
        </label>
        <label className={styles.formLabel}>size (optional)
          <input className={styles.formInput} value={size} maxLength={20} onChange={(e) => setSize(e.target.value)} />
        </label>
      </div>
      <button className={styles.buttonPrimary} onClick={mint} disabled={minting || !Number(count)}>
        {minting ? 'minting…' : 'mint items'}
      </button>
      {error && <p style={{ color: '#ff6b6b', marginTop: '12px' }}>{error.toLowerCase()}</p>}

      {minted.length > 0 && (
        <div style={{ marginTop: '20px', padding: '16px', border: '1px solid rgba(255,200,0,0.5)', borderRadius: '12px' }}>
          <p style={{ color: '#ffd666', marginTop: 0 }}>
            these {minted.length} claim codes won&apos;t be shown again. print or download them before leaving this page.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button className={styles.buttonPrimary} onClick={() => void printSheet(productSetName, minted)}>print sheet</button>
            <button className={styles.buttonSecondary} onClick={() => downloadCsv(productSetName, minted)}>download csv</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {minted.map((item) => (
              <div key={item.publicId} style={{ display: 'flex', gap: '12px', color: 'white', fontSize: '0.8rem', fontFamily: 'ui-monospace, monospace' }}>
                <div style={{ textAlign: 'center' }}>
                  <QRCodeSVG value={item.publicUrl} size={96} bgColor="#ffffff" fgColor="#000000" includeMargin />
                  <div>{item.publicId}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <QRCodeSVG value={item.claimUrl} size={96} bgColor="#ffffff" fgColor="#000000" includeMargin />
                  <div>{item.claimCode}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rotated && (
        <div style={{ marginTop: '16px', padding: '12px', border: '1px solid rgba(255,200,0,0.5)', borderRadius: '12px', color: 'white' }}>
          <p style={{ marginTop: 0 }}>new claim code for {rotated.publicId} (shown once):</p>
          <QRCodeSVG value={rotated.claimUrl} size={96} bgColor="#ffffff" fgColor="#000000" includeMargin />
          <p style={{ fontFamily: 'ui-monospace, monospace' }}>{rotated.claimCode}</p>
          <button className={styles.buttonSecondary} onClick={() => setRotated(null)}>done</button>
        </div>
      )}

      {existing.length > 0 && (
        <table style={{ width: '100%', marginTop: '20px', color: 'white', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.7 }}>
              <th>id</th><th>edition</th><th>status</th><th>claimed</th><th />
            </tr>
          </thead>
          <tbody>
            {existing.map((item) => (
              <tr key={item.publicId} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ fontFamily: 'ui-monospace, monospace', padding: '6px 0' }}>
                  <a href={`/p/${item.publicId}`} style={{ color: 'white' }}>{item.publicId}</a>
                </td>
                <td>{item.editionNumber ? `${item.editionNumber}${item.editionSize ? ` of ${item.editionSize}` : ''}` : '—'}</td>
                <td>{item.status}</td>
                <td>{item.claimedAt ? new Date(item.claimedAt).toLocaleDateString() : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {item.status === 'claimable' && (
                    <button className={styles.buttonSecondary} onClick={() => void newCode(item.publicId)} style={{ marginRight: '8px' }}>new code</button>
                  )}
                  {item.status !== 'void' && (
                    <button className={styles.buttonSecondary} onClick={() => void voidItem(item.publicId)}>void</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
