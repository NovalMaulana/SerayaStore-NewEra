import { useState, useCallback, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import md5 from 'md5';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Send, Image, Mic, FileText, Trash2, Edit2, X, CropIcon, Search, Clock } from 'lucide-react';

// Komponen SortableDraft
const SortableDraft = ({ draft, index, globalIndex, handleEditDraft, handleDeleteDraft, onImageClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: draft.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    backgroundColor: '#2d2d2d',
  };

  // Fungsi untuk menghitung ukuran file dari data URL
  const calculateFileSize = (dataUrl) => {
    const base64Length = dataUrl.split(',')[1].length;
    const fileSizeInBytes = Math.ceil((base64Length * 3) / 4);
    return formatFileSize(fileSizeInBytes);
  };

  // Fungsi untuk memformat ukuran file
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Tambahkan fungsi handleImageClick yang terpisah
  const handleImageClick = (e) => {
    e.stopPropagation(); // Mencegah event bubbling
    onImageClick(draft.message);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 rounded-xl border border-[#404040] flex flex-col h-full hover:border-[#6366F1] transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-[#E5E7EB] bg-[#404040] px-3 py-1 rounded-full">
            Draft {index + 1}
          </span>
          {(draft.type === 'image' || draft.type === 'audio') && (
            <span className="text-xs text-[#9CA3AF]">
              {calculateFileSize(draft.message)}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleEditDraft(globalIndex)}
            className="p-1.5 text-[#6366F1] hover:bg-[#404040] rounded-md transition-colors duration-150"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDeleteDraft(globalIndex)}
            className="p-1.5 text-[#EF4444] hover:bg-[#404040] rounded-md transition-colors duration-150"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {draft.type === 'image' ? (
        <div className="relative group cursor-pointer" onClick={handleImageClick}>
          <div className="absolute top-2 right-2 bg-[#2d2d2d]/80 rounded-full p-1.5 shadow-sm">
            <Image size={14} className="text-[#6366F1]" />
          </div>
          <img
            src={draft.message}
            alt="Uploaded"
            className="w-full h-48 object-contain rounded-lg bg-[#1a1a1a]"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white bg-black bg-opacity-50 px-3 py-1.5 rounded-lg text-sm flex items-center space-x-2">
              <CropIcon size={14} />
              <span>Crop image</span>
            </div>
          </div>
        </div>
      ) : draft.type === 'audio' ? (
        <div className="relative">
          <div className="absolute top-2 right-2 bg-[#2d2d2d]/80 rounded-full p-1.5 shadow-sm">
            <Mic size={14} className="text-[#6366F1]" />
          </div>
          <audio
            controls
            src={draft.message}
            className="w-full mt-2"
          />
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-2 right-2 bg-[#2d2d2d]/80 rounded-full p-1.5 shadow-sm">
            <FileText size={14} className="text-[#6366F1]" />
          </div>
          <p className="text-sm text-[#E5E7EB] bg-[#1a1a1a] p-4 rounded-lg">
            {draft.message}
          </p>
        </div>
      )}
    </div>
  );
};

function App() {
  const [selectedWebhookUrl, setSelectedWebhookUrl] = useState('');
  const [selectedWebhookName, setSelectedWebhookName] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [sentDraftIds, setSentDraftIds] = useState(() => {
    const savedIds = localStorage.getItem('sentDraftIds');
    return savedIds ? JSON.parse(savedIds) : {};
  });
  const [isSending, setIsSending] = useState(false);
  const [sendDelay, setSendDelay] = useState(5);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [crop, setCrop] = useState({ unit: '%', x: 25, y: 25, width: 50, height: 50 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(null); // Tambahkan state untuk aspect ratio
  const imgRef = useRef(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [currentApiKeyIndex, setCurrentApiKeyIndex] = useState(0);
  const fileInputRef = useRef(null);
  const [isUpscaleModalOpen, setIsUpscaleModalOpen] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // Ubah dari pendingImage ke pendingImages untuk multi file
  const [upscaleFactor, setUpscaleFactor] = useState(2);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState({ backedUp: 0, total: 0 });

  const ocrApiKeys = [
    'K86594910588957',
    'K82987667488957',
    'K81079472388957',
    'K85646823288957'
  ];

  const webhookUrls = {
    'Testing Website': 'https://discord.com/api/webhooks/1346700930338258945/WiBw1PV0SX_Y8j30I7BMfGVaqwW1MjtojFjhjPdO2rriK2a9Pyy61PWGAH6oR7U-pOou',
    'Feni': 'https://discord.com/api/webhooks/1239113110757838909/4LV2rSKeAKuTAvaNQU-qYzOd7WdjRtf1qwmLykefZ6WxiWOrnzdhwjyDBY-6QngasKg_',
    'Gracia': 'https://discord.com/api/webhooks/1239114098294394940/rOcMeGd_C5_eVltHUVqMIIZM178kL4Yd0cEAYt-hcqrZsFpcyHhuDiv8VF8I34vtXwCd',
    'Gita': 'https://discord.com/api/webhooks/1239113789274718280/iymXG2FVhYTS84H7Q2f_W6JNI8uleHWEs43PNwA1AjSh4xyuVIAOEqr8AZg0FpUm_WUl',
    'Christy': 'https://discord.com/api/webhooks/1239111998860431410/8nqojNywJUCYaXxPU5e7lMD5ui8WgOc6S524_J_7_SGny3JcfQ9uQWrfCOtdv9sZd5lI',
    'Eli': 'https://discord.com/api/webhooks/1239112668070281277/jXB8KmEu-zLnammMvuJbkchCotujBjNNJUbk5cUPv6-8EFZVROQ1KvM-G6MWxaTCdog1',
    'Freya': 'https://discord.com/api/webhooks/1239113553743577169/b_0rUeceQBbvh-4sRE5x0dCxPFBx0V59aMawRrfIZfyBWpw7iL0DTm7j80Q-b5GgBvJ7',
    'Jessi': 'https://discord.com/api/webhooks/1239117376612466719/B0R9s4Of_gg2GUkHlRF0-ZzHWTZIe_cufRrNSToR8eBl2PItniWXIO40CA-nCwxfrIh6',
    'Muthe': 'https://discord.com/api/webhooks/1239118022652727326/T6C3Lydu2uL0akT-dfUH7-LYzadeDLpbt5fOyLd56zoEp67Q70heh4ETquJOVOGN88mt',
    'Olla': 'https://discord.com/api/webhooks/1239118024406208544/tJcjlteKdda-p_q8K8WpJ7w_Ya6bW3Ad9AwwKF0furOIVKtgPGLyNErr2gp-PqeVKDIb',
    'Fiony': 'https://discord.com/api/webhooks/1239113317037899806/ip-QnUqZcx6XbjxSZYAhJAqX69avW97LsxsF7tLc3ZlED-rQ1-eqqPxTWRKwIbaX2s0k',
    'Lulu': 'https://discord.com/api/webhooks/1239117382497210488/VHt4eRdgKM5k6FyLWx2MHbgFMOLbOE7xRCO7AbJIdxNp-b1qkqqYiX3WwWXbhCXFHCC7',
    'Oniel': 'https://discord.com/api/webhooks/1239118026041987102/ZQQF_YzhzWflONHr509OdU02C-awEDmiA3dRQRMaB_ct5xycNKFA17_gcyiMzyzKo7-m',
    'Indah': 'https://discord.com/api/webhooks/1239116569640960063/XYpPaKRt_jjUkCwm9WzPJupDMvKPvCZEk2mrASs3KGQqCVLqTq4JGWwYkSekKbBZj4V4',
    'Kathrina': 'https://discord.com/api/webhooks/1239117378751696926/PgvuA0AS84o02y7T2seUl2aUZwdofCqFPROmEmmW1wIF6Y4pq3sTCE6DYqCe1Xnc1jvl',
    'Marsha': 'https://discord.com/api/webhooks/1239118019947528192/QvEcxIuuF80Zr0iWY7Uqf6gLw4RMd5Cu_I6TngaBnuG_MkVZxxJI35ejwx9N7QwvY2BC',
    'Amanda': 'https://discord.com/api/webhooks/1239111339759239219/J3Wquc_-B3E1xPQWg-2BnD1rJoNxhKI_PLNYzwz_0pfLPPajuVroHQaM3Jw_cwEivbLE',
    'Ella': 'https://discord.com/api/webhooks/1239112928821514260/gXUKFG0XgNoPHhL3lVAnrf3rJ92oMmOrYp8StmfrUQ2a0JbEF6kAU-LjzUW34iGHjABh',
    'Indira': 'https://discord.com/api/webhooks/1239116603463831552/0ggtQ_BVpp1_KK0N2aIxZQwCNByduhNhmNAGI3aed_nmyXhK-yK9922-rYOSMMbroI7s',
    'Lia': 'https://discord.com/api/webhooks/1239117380538466364/eNyYL8aZpDtFF5NjnsFSIVNYrjxnEQ5-amWmQlWt_dnSXVtyZXkgKm_tBm_XQgz4EKJP',
    'Lyn': 'https://discord.com/api/webhooks/1239118014390079508/oPx0HZhvYAs0llfJhopAXwIf9BgwOkozbmaMAPtDafNm6tMhynH1UG6MFf3JLEOF1Apf',
    'Raisha': 'https://discord.com/api/webhooks/1239122633736327269/VbNwr0UvMIjlgwK0VlnMZFUdTtJkNzNJs7bcCQWrD-QAG78I1g1dc60JyqEzM7TW5-2U',
    'Alya': 'https://discord.com/api/webhooks/1327301945383321671/3xuGMLUip1pVctkUKKS3yuhvajb6tw296CAEvkCPoJU_s5LGoXVcZlyJgdX3KZ3pKx05',
    'Anindya': 'https://discord.com/api/webhooks/1239111454620254219/WLLXqGbV9NtnBGuK00T9Yx0zRIvg3WG-uI2hhl2S-gGE6se9fdQKnGBPoIY-kqe9LOfx',
    'Cathy': 'https://discord.com/api/webhooks/1239111741565042688/vrZA0IjzLv0DOVDGRGwUikQmUGp4WegIEVCXoDxiRGmR4DAhNcAdv8EE5q4BkqLNRgk1',
    'Chelsea': 'https://discord.com/api/webhooks/1239111875426385980/m1_MP2uT-fOUfumf2q-ALlYK4ewsA2-Tyu4czehzdioFTQKD2UHVCkKIvZc5OB7jkGoZ',
    'Cynthia': 'https://discord.com/api/webhooks/1239112180150833172/k2kVkgJ0oD1cOErKzG5ruxv6La3G3wtcn0osRE_XuVzuVlg0xqvsMo6DQw0xoRC-2MAB',
    'Daisy': 'https://discord.com/api/webhooks/1239112311738990663/q1PWqm9oY-KRV6ee948nhJHx-xGW6R32z_2b95WGCJDJfNFPzXZuV6GIaKzsuLlwEi5B',
    'Danella': 'https://discord.com/api/webhooks/1239112452428533820/DS6o6aCnc1g0B_XU_4SU8WJ957JNI-4yKe1BBqhd44ys159i8gVi45rXznblirJPl-xQ',
    'Elin': 'https://discord.com/api/webhooks/1239112799297474561/MqZ9iTFSYtuEOdxbLS4G_JLDiejsbR7eLLp0_5QmbfGSFA5YG4uiJOmC7TqD2VBF34kS',
    'Gendis': 'https://discord.com/api/webhooks/1239113647335411836/qH0a6jEgDB_SVz9s5pWlxYH92fE8PTMrawKLETzA9E2TALsrgmEesiVw09KillZbx8mp',
    'Gracie': 'https://discord.com/api/webhooks/1239116561139241000/gEI_o6LpG3WzdQs_Hm_XU37jFtDrO8YW0OTaFyUO5vRoSB62_e2Uub9wUWl-67yYrwrq',
    'Greesel': 'https://discord.com/api/webhooks/1239116567707521054/ZKpHeg1HqD4vMClB6PI0T_9IKi68Ed503iynAv2NUfhaQMLTuqDOxFRCt4lQT2JPOn9-',
    'Michie': 'https://discord.com/api/webhooks/1239118020920737845/X9jroJFbbt5P3X1k-Cb2Km5XitaoGIW_Uayfcv0To5ZV3wiLj10rI-h3MLdyycfVNHJz',
    'Aralie': 'https://discord.com/api/webhooks/1298526014804197386/Gmxnyxe0Vob5T5cp8r4XSQAQba3fv5LB5szRmi-mPUbpakcTj0l0o2L4Bvo4809KxyN1',
    'Delynn': 'https://discord.com/api/webhooks/1298526550601371649/7XrgZqfMu6epSnpemN2Q42jw7wEyxQS3_jDWkTy6_yTDUgSuWOLdjnIpCGuD4iV4pJLV',
    'Erine': 'https://discord.com/api/webhooks/1298354149842489405/l2c4sbCao_RvG-avzVZ7zkOxyF3c21YNkyXX1gFsni_YGfyWF36oIYI1KrY9AxXmBBZX',
    'Fritzy': 'https://discord.com/api/webhooks/1298527062914498590/HOOtCxJwR7Fsp3XTueu0WwLWxkZvRu2aq4qj3sFu3FpPJwiEESnOTVdYLlvcTEdg-a5I',
    'Kimmy': 'https://discord.com/api/webhooks/1298529298621268039/wbDhmEdlrp49ysKA7hk8kJO11FDcBbClSjnSuP7_ublo0Y2f6cD-4K2v0bP0lJ8owfQk',
    'Lana': 'https://discord.com/api/webhooks/1298526729907867731/j63FbAwY4liZ3LJHynxVk9CQzrBrc5rDk4EblMnY6F1boPclT1HdgTxkmZnFVI6PlY4k',
    'Levi': 'https://discord.com/api/webhooks/1298527849803681862/zxH1gl8HmrlTQU3-TZQ7n4KYLF-GFgu3UfiwYK3VnNm1R1y3yVrDgAHD92a0hOWBLGYP',
    'Lily': 'https://discord.com/api/webhooks/1298527209119682600/I4CRNgj3eH_vzWzKO3Lq-uGFGtkj1Cq_4zR9qOJs9p3Ts6ziLngHLD-wt-rapYLB7NHr',
    'Moreen': 'https://discord.com/api/webhooks/1298527653644599359/kRa7GoF7X92hOc4v7H6iuLyCytrPVpaDVKszaulvwMXnk_tGhEeAVA-d30mUSk-jH2c0',
    'Nala': 'https://discord.com/api/webhooks/1298529076948111360/KuXiWbgNvTuIfQGu9GFhZT4Nqkk3b_OorMyvoX1BPxPTeWre0yckAfyQeQwwQdifL1Sv',
    'Nachia': 'https://discord.com/api/webhooks/1298528136580829196/7_wFj5NLLwC5DFgDTUSE6fn0YZJPjRBV8qSOQhHhgKuoClAmAXsPS-ePF_CYqqPkkJHi',
    'Nayla': 'https://discord.com/api/webhooks/1298527996344275006/KAN8_Igq_aUlk2MUevqPsMlquCZOpjUAPi1KFl5gTL15KLTuXov1YYGkAQYIGXBAsZih',
    'Oline': 'https://discord.com/api/webhooks/1299728545832243294/2dSVtSAekuWnIu2xkkR8sibtQV9new7x-cPgTa79YAq20BebO3zDBAMugF3eQ2gga9sb',
    'Reggie': 'https://discord.com/api/webhooks/1298894153710702623/XZREV-5yW7AXSctcVSJEjLxWSNNvfO9gJepPOvJmC92rUqbDPKd_gXrCnCQcYv8JA8cF',
    'Ribka': 'https://discord.com/api/webhooks/1298528906474946631/Nj5nLuBGxYJVgSZYt7B78hld0NMVZwpv4T__2LsA1ZygMoyxYsmsLMqXRabvL3WUDi37',
    'Trisha': 'https://discord.com/api/webhooks/1298527442448945234/9uOXWjrJfLs-CZ7VWWnublbKaS_zjCFQXHLbLlRyOnLZkvzO5-3WHeMzUNi2nP7vQ0zZ',
    'Aprili': 'https://discord.com/api/webhooks/1362451593072480417/bIZfGVniztyBtyyvLCOMqw88pYZXZmy-VXXS5h_bPbu9DuntDokUIRz1sgzVJgsyx1iq',
    'Auwia': 'https://discord.com/api/webhooks/1362451834261737647/SmpSiztQ87WO_7ZFAhvLV6VfO10rMFpnPZVaccbsXSCaDgPyD9_lz2x9EeiKN_2HXJrI',
    'Ekin': 'https://discord.com/api/webhooks/1362451928860201142/BPDUQ4v22K-l-lMTLgsam13_kuhz05V7YYn6K0dOQMIVtFHACgqXhJ9RZO5ojjulvfAZ',
    'Intan': 'https://discord.com/api/webhooks/1362452037547196477/AI_eFae1HKiS5kXPgyemxTfnmiqn9R9zJuNfyTZ0Kltb_5D5GVewB76N1-27UeoJu27j',
    'Jemima': 'https://discord.com/api/webhooks/1362452132132819126/y9pZ_8QKUtfilMkgkEDsrQYoyTPiAJwRVwpByCLFNWAuWJtnQAaU-qLNmL6En-ESKKSZ',
    'Maira': 'https://discord.com/api/webhooks/1362452227507224616/QpGw6xNMEWPqBPNzofyVHJMaJOQkJ9WjFcHF3ogYOEvhasKLpyNABDmTusX8fpYgPIZW',
    'Mikaela': 'https://discord.com/api/webhooks/1362452311334584473/zcVELeDgrUJoUECZ4LK8gapNziyhMG52_867-v1bffMZTK16l204pj5S2IPW4zAi_ZrA',
    'Hagia': 'https://discord.com/api/webhooks/1362452395682168973/6VjsYUB5NLloS2gSdZmk113_azQ8XykdNSdWCI-liXbQRMjPK-FNt30Q76tqMVKWjWMN',
    'Virgi': 'https://discord.com/api/webhooks/1362452475814350968/XjsIcFyIYuWruRlZ_SF-yiJs2WV75-GYSNRZZMAst7xzb7fMTF8td3KOE94U8J9OoEBM',
  };

  const logWebhookUrl = 'https://discord.com/api/webhooks/1351586329426919425/S5YADm0dDKr-RAsOMgDgIEpDnH7896vgxlnpmi_PuvAPytLqpXn33YsAJttSEKyfZgCq';

  const sendLogToWebhook = async (logMessage) => {
    const formData = new FormData();
    formData.append('content', logMessage);

    try {
      const response = await fetch(logWebhookUrl, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to send log to webhook');
      }
      console.log('Log successfully sent to webhook!');
    } catch (error) {
      console.error('Error sending log to webhook:', error);
    }
  };

  async function getOrCreateFolder(folderName) {
    try {
      console.log('Searching for folder:', folderName);
      const response = await drive.files.list({
        q: folderName, // Tanpa tanda kutip, biarkan API menangani
        fields: 'files(id, name, mimeType, trashed)',
        spaces: 'drive',
      });
  
      console.log('API response:', JSON.stringify(response.data, null, 2));
  
      const folder = response.data.files.find(
        file => file.name === folderName && 
                file.mimeType === 'application/vnd.google-apps.folder' && 
                !file.trashed
      );
  
      if (folder) {
        console.log('Folder found:', folder);
        return folder.id;
      }
  
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };
      const newFolder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id',
      });
      console.log('New folder created:', newFolder.data);
      return newFolder.data.id;
    } catch (error) {
      console.error('Error in getOrCreateFolder:', error.message, error.stack);
      throw new Error(`Failed to get or create folder: ${error.message}`);
    }
  }

  async function backupImagesToDrive() {
    if (!selectedWebhookUrl) {
      alert('Please select a webhook first');
      return;
    }
  
    // Filter hanya draft yang memiliki originalMessage yang valid
    const imageDrafts = drafts.filter(
      draft => draft.type === 'image' && 
               typeof draft.originalMessage === 'string' && 
               draft.originalMessage.length > 0
    );
    if (imageDrafts.length === 0) {
      alert('No valid images to backup');
      return;
    }
  
    setIsBackingUp(true);
    setBackupProgress({ backedUp: 0, total: imageDrafts.length });
  
    try {
      // Kelompokkan gambar berdasarkan webhookName
      const groupedImages = imageDrafts.reduce((acc, draft) => {
        const { webhookName } = draft;
        if (!acc[webhookName]) {
          acc[webhookName] = [];
        }
        acc[webhookName].push({
          id: draft.id,
          dataURL: draft.originalMessage, // Gunakan versi tanpa watermark
        });
        return acc;
      }, {});
  
      // Kirimkan permintaan terpisah untuk setiap webhook
      let backedUpCount = 0;
      for (const [webhookName, images] of Object.entries(groupedImages)) {
        console.log(`Backing up ${images.length} images to folder "${webhookName}"`);
        const response = await fetch('http://localhost:3001/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderName: webhookName,
            images,
          }),
        });
  
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.details || 'Backup failed');
        }
  
        backedUpCount += images.length;
        setBackupProgress({ backedUp: backedUpCount, total: imageDrafts.length });
      }
  
      alert(`Successfully backed up ${imageDrafts.length} images to Google Drive!`);
    } catch (error) {
      console.error('Error backing up images:', error);
      alert(`Failed to backup images: ${error.message}`);
    } finally {
      setIsBackingUp(false);
      setBackupProgress({ backedUp: 0, total: 0 });
    }
  }

  const cleanOldIds = (ids) => {
    const now = Date.now();
    const fiveHoursInMs = 5 * 60 * 60 * 1000;
    const cleanedIds = { ...ids };
    let hasChanges = false;

    for (const [id, timestamp] of Object.entries(cleanedIds)) {
      if (now - timestamp > fiveHoursInMs) {
        delete cleanedIds[id];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setSentDraftIds(cleanedIds);
    }
    return cleanedIds;
  };

  useEffect(() => {
    const cleanedIds = cleanOldIds(sentDraftIds);
    localStorage.setItem('sentDraftIds', JSON.stringify(cleanedIds));
  }, [sentDraftIds]);

  useEffect(() => {
    cleanOldIds(sentDraftIds);
    const interval = setInterval(() => {
      cleanOldIds(sentDraftIds);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    })
  );

  const dataURLtoBlob = (dataURL) => {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const array = [];
    for (let i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], { type: 'image/png' }); // Pastikan type adalah PNG
  };

  // Fungsi handleDragEnter yang diperbarui
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedWebhookUrl) {
      alert('Silakan pilih webhook terlebih dahulu sebelum mengupload file.');
      return;
    }
    setIsDraggingOver(true);
  }, [selectedWebhookUrl]);

  // Fungsi handleDragOver yang diperbarui
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Fungsi handleDragLeave yang diperbarui
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Periksa apakah mouse benar-benar meninggalkan container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      setIsDraggingOver(false);
    }
  }, []);

  const addWatermark = (imageDataURL) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new window.Image();
      img.src = imageDataURL;
  
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
  
        // Gambar asli sebagai dasar
        ctx.drawImage(img, 0, 0);
  
        // 1. Tambahkan watermark tak terlihat berbasis DCT dengan pola yang lebih kompleks
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
  
        // Fungsi untuk mendapatkan warna piksel lokal
        const getPixelColor = (x, y) => {
          const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
          return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            intensity: (data[index] + data[index + 1] + data[index + 2]) / 3
          };
        };
  
        // Pola DCT yang lebih kompleks dengan multiple frekuensi
        const blockSize = 8;
        const watermarkStrength = 8;
        for (let y = 0; y < canvas.height; y += blockSize) {
          for (let x = 0; x < canvas.width; x += blockSize) {
            for (let by = 0; by < blockSize; by++) {
              for (let bx = 0; bx < blockSize; bx++) {
                const px = x + bx;
                const py = y + by;
                if (px < canvas.width && py < canvas.height) {
                  const index = (py * canvas.width + px) * 4;
                  // Gunakan multiple sinusoidal patterns
                  const freqMod = (
                    Math.sin((bx + by) * 0.5) * 0.4 +
                    Math.cos((bx - by) * 0.3) * 0.3 +
                    Math.sin((bx * by) * 0.2) * 0.3
                  ) * watermarkStrength;
                  
                  // Modifikasi setiap channel warna secara berbeda
                  data[index] = Math.min(255, Math.max(0, data[index] + freqMod * 1.2));
                  data[index + 1] = Math.min(255, Math.max(0, data[index + 1] + freqMod * 0.8));
                  data[index + 2] = Math.min(255, Math.max(0, data[index + 2] + freqMod * 0.6));
                }
              }
            }
          }
        }
  
        // 2. Tambahkan noise pattern yang halus
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 3;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
  
        // 3. Tambahkan pola geometris tersembunyi
        const patternSize = Math.min(canvas.width, canvas.height) / 32;
        for (let y = 0; y < canvas.height; y += patternSize) {
          for (let x = 0; x < canvas.width; x += patternSize) {
            const pattern = (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 2;
            const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
            if (index < data.length - 4) {
              data[index] = Math.min(255, Math.max(0, data[index] + pattern));
              data[index + 1] = Math.min(255, Math.max(0, data[index + 1] + pattern * 0.7));
              data[index + 2] = Math.min(255, Math.max(0, data[index + 2] + pattern * 0.5));
            }
          }
        }
  
        ctx.putImageData(imageData, 0, 0);
  
        // 4. Tambahkan watermark teks dengan opacity dan ukuran yang bervariasi
        const watermarkText = "© Private Message JKT48";
        const numWatermarks = Math.floor((canvas.width * canvas.height) / 40000);
        
        for (let i = 0; i < numWatermarks; i++) {
          ctx.save();
          
          // Posisi acak
          const offsetX = Math.random() * canvas.width;
          const offsetY = Math.random() * canvas.height;
          ctx.translate(offsetX, offsetY);
          
          // Rotasi acak dengan variasi yang lebih besar
          const angle = (Math.random() - 0.5) * Math.PI;
          ctx.rotate(angle);
          
          // Ukuran font yang bervariasi
          const fontSize = Math.max(12, Math.floor(canvas.width / 40) + Math.random() * 8);
          ctx.font = `${fontSize}px Arial`;
          
          // Opacity yang sangat bervariasi
          const baseAlpha = 0.1 + Math.random() * 0.2;
          ctx.globalAlpha = baseAlpha;
          
          // Ambil warna lokal untuk adaptasi
          const pixel = getPixelColor(offsetX, offsetY);
          const contrast = (pixel.r + pixel.g + pixel.b) / 3 > 128 ? 0 : 255;
          
          // Tambahkan stroke untuk keterbacaan
          ctx.strokeStyle = `rgba(${contrast}, ${contrast}, ${contrast}, ${baseAlpha * 0.8})`;
          ctx.lineWidth = 0.5;
          ctx.strokeText(watermarkText, 0, 0);
          
          // Warna teks yang adaptif
          ctx.fillStyle = `rgba(${255-contrast}, ${255-contrast}, ${255-contrast}, ${baseAlpha})`;
          ctx.fillText(watermarkText, 0, 0);
          
          ctx.restore();
        }
  
        // 5. Tambahkan pola mikroskopis
        const microPattern = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const microData = microPattern.data;
        for (let i = 0; i < microData.length; i += 16) {
          const microNoise = Math.sin(i * 0.01) * 2;
          if (i + 3 < microData.length) {
            microData[i] = Math.min(255, Math.max(0, microData[i] + microNoise));
            microData[i + 1] = Math.min(255, Math.max(0, microData[i + 1] + microNoise * 0.7));
            microData[i + 2] = Math.min(255, Math.max(0, microData[i + 2] + microNoise * 0.5));
          }
        }
        ctx.putImageData(microPattern, 0, 0);
  
        resolve(canvas.toDataURL("image/png"));
      };
  
      img.onerror = (error) => {
        reject(new Error("Failed to load image: " + error.message));
      };
    });
  };

  const applySharpenFilter = (canvas, ctx, strength = 0.5) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
  
    // Matriks sharpening yang lebih lembut
    const sharpenMatrix = [
      [0, -0.1 * strength, 0],
      [-0.1 * strength, 1 + 0.4 * strength, -0.1 * strength],
      [0, -0.1 * strength, 0]
    ];
  
    const outputData = new Uint8ClampedArray(data);
  
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
  
        // Terapkan matriks konvolusi
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            const index = (py * width + px) * 4;
            const weight = sharpenMatrix[ky + 1][kx + 1];
  
            r += data[index] * weight;
            g += data[index + 1] * weight;
            b += data[index + 2] * weight;
          }
        }
  
        const outIndex = (y * width + x) * 4;
        outputData[outIndex] = Math.min(255, Math.max(0, r));
        outputData[outIndex + 1] = Math.min(255, Math.max(0, g));
        outputData[outIndex + 2] = Math.min(255, Math.max(0, b));
        outputData[outIndex + 3] = data[outIndex + 3]; // Alpha tidak berubah
      }
    }
  
    ctx.putImageData(new ImageData(outputData, width, height), 0, 0);
  };

  const upscaleImage = async (imageDataURL, factor) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.src = imageDataURL;

      img.onload = () => {
        // Hitung ukuran file dalam bytes
        const base64Data = imageDataURL.split(',')[1];
        const fileSizeInBytes = Math.ceil((base64Data.length * 3) / 4);
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

        // Jika upscale 4x dan ukuran file > 7MB, tolak
        if (factor === 4 && fileSizeInMB > 7) {
          reject(new Error('Ukuran file melebihi batas 7MB untuk upscale 4x'));
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set ukuran canvas sesuai faktor upscale
        canvas.width = img.width * factor;
        canvas.height = img.height * factor;
        
        // Gambar gambar yang sudah di-upscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Hitung sharpness strength berdasarkan ukuran gambar asli
        const originalSize = img.width * img.height;
        let sharpnessStrength = 0.3; // Default untuk gambar kecil

        if (originalSize > 2000000) { // > 2MP
          sharpnessStrength = 0.2;
        } else if (originalSize > 1000000) { // > 1MP
          sharpnessStrength = 0.25;
        }
        
        // Terapkan filter sharpening dengan kekuatan yang sudah disesuaikan
        applySharpenFilter(canvas, ctx, sharpnessStrength);
        
        // Langsung resolve tanpa watermark
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = (error) => reject(error);
    });
  };

  const handleUpscaleConfirm = async () => {
    if (isUpscaling || pendingImages.length === 0) {
      return;
    }
  
    setIsUpscaling(true);
  
    try {
      const upscalePromises = pendingImages.map(async (imageData) => {
        try {
          // Upscale gambar tanpa watermark
          const upscaledImage = await upscaleImage(imageData.dataURL, upscaleFactor);
          // Tambahkan watermark hanya untuk pengiriman ke webhook
          const watermarkedImage = await addWatermark(upscaledImage);
          const draftId = md5(`${imageData.originalFile.name}-${imageData.originalFile.size}`);
  
          // Cek apakah draft sudah ada
          const isDuplicate = drafts.some(draft => draft.id === draftId);
          if (isDuplicate) {
            return null;
          }
  
          return {
            id: draftId,
            webhookName: selectedWebhookName,
            message: watermarkedImage, // Versi dengan watermark untuk webhook
            originalMessage: upscaledImage, // Versi tanpa watermark untuk backup
            type: 'image',
          };
        } catch (error) {
          console.error(`Error upscaling image ${imageData.originalFile.name}:`, error);
          if (error.message.includes('melebihi batas 7MB')) {
            alert(`Gambar ${imageData.originalFile.name} tidak dapat di-upscale 4x karena ukuran file melebihi 7MB. Silakan pilih upscale 2x atau gunakan gambar dengan ukuran lebih kecil.`);
          }
          return null;
        }
      });
  
      const newDrafts = await Promise.all(upscalePromises);
      const validDrafts = newDrafts.filter(draft => draft !== null);
  
      if (validDrafts.length === 0) {
        alert('Tidak ada gambar yang berhasil di-upscale. Silakan coba lagi dengan pengaturan yang berbeda.');
      } else {
        setDrafts((prevDrafts) => {
          const existingIds = new Set(prevDrafts.map(draft => draft.id));
          const uniqueNewDrafts = validDrafts.filter(draft => !existingIds.has(draft.id));
          return [...prevDrafts, ...uniqueNewDrafts];
        });
      }
  
    } catch (error) {
      console.error('Error during upscale process:', error);
      alert('Terjadi kesalahan saat memproses upscale. Silakan coba lagi.');
    } finally {
      setIsUpscaleModalOpen(false);
      setPendingImages([]);
      setUpscaleFactor(2);
      setIsUpscaling(false);
    }
  };

  const handleSkip = async () => {
    if (isUpscaling || pendingImages.length === 0) {
      return;
    }

    setIsUpscaling(true);

    try {
      const skipPromises = pendingImages.map(async (imageData) => {
        try {
          const draftId = md5(`${imageData.originalFile.name}-${imageData.originalFile.size}`);
          
          // Cek apakah draft sudah ada
          const isDuplicate = drafts.some(draft => draft.id === draftId);
          if (isDuplicate) {
            return null;
          }

          // Tambahkan watermark ke gambar asli
          const watermarkedImage = await addWatermark(imageData.dataURL);

          return {
            id: draftId,
            webhookName: selectedWebhookName,
            message: watermarkedImage, // Versi dengan watermark untuk webhook
            originalMessage: imageData.dataURL, // Versi asli tanpa watermark untuk backup
            type: 'image',
          };
        } catch (error) {
          console.error(`Error processing image ${imageData.originalFile.name}:`, error);
          return null;
        }
      });

      const newDrafts = await Promise.all(skipPromises);
      const validDrafts = newDrafts.filter(draft => draft !== null);

      if (validDrafts.length === 0) {
        alert('Tidak ada gambar yang berhasil diproses. Silakan coba lagi.');
      } else {
        setDrafts((prevDrafts) => {
          const existingIds = new Set(prevDrafts.map(draft => draft.id));
          const uniqueNewDrafts = validDrafts.filter(draft => !existingIds.has(draft.id));
          return [...prevDrafts, ...uniqueNewDrafts];
        });
      }

    } catch (error) {
      console.error('Error during skip process:', error);
      alert('Terjadi kesalahan saat memproses gambar. Silakan coba lagi.');
    } finally {
      setIsUpscaleModalOpen(false);
      setPendingImages([]);
      setUpscaleFactor(2);
      setIsUpscaling(false);
    }
  };

  // Fungsi handleDrop yang diperbarui
  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    setIsDraggingOver(false);
    
    if (!selectedWebhookUrl) {
      alert('Silakan pilih webhook terlebih dahulu sebelum mengupload file.');
      return;
    }

    try {
      const files = Array.from(event.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length > 0) {
        const imagePromises = imageFiles.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
              dataURL: reader.result,
              originalFile: file
            });
            reader.readAsDataURL(file);
          });
        });

        const imageData = await Promise.all(imagePromises);
        setPendingImages(imageData);
        setIsUpscaleModalOpen(true);
      }

      // Handle non-image files (audio)
      const nonImageDrafts = await Promise.all(
        files.filter(file => !file.type.startsWith('image/')).map(async (file) => {
          if (file.type.startsWith('audio/')) {
            const reader = new FileReader();
            const messageContent = await new Promise((resolve) => {
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(file);
            });
            return {
              id: md5(`${file.name}${Date.now()}`),
              webhookName: selectedWebhookName,
              message: messageContent,
              type: 'audio',
            };
          }
          return null;
        })
      );

      const validNonImageDrafts = nonImageDrafts.filter(draft => draft !== null);
      if (validNonImageDrafts.length > 0) {
        setDrafts(prevDrafts => [...prevDrafts, ...validNonImageDrafts]);
      }
    } catch (error) {
      console.error('Error handling dropped files:', error);
      alert('Terjadi kesalahan saat memproses file. Silakan coba lagi.');
    }
  }, [selectedWebhookUrl, selectedWebhookName]);

  const handleWebhookSelect = (url, name) => {
    setSelectedWebhookUrl(url);
    setSelectedWebhookName(name);
  };

  const handleNewChat = () => {
    setIsModalOpen(true); // Langsung buka modal, validasi sudah di Navbar
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        setMessage(message + '\n');
      }
    }
  };

  const handleSaveDraft = () => {
    if (message.trim()) {
      const messages = message.split('\n').filter((msg) => msg.trim());
      const newDrafts = messages.map((msg) => ({
        id: `${Date.now()}-${Math.random()}`,
        webhookName: selectedWebhookName,
        message: msg,
        type: 'text',
      }));
      setDrafts([...drafts, ...newDrafts]);
      setMessage('');
      setIsModalOpen(false);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleEditDraft = (index) => {
    const draftToEdit = drafts[index];
    if (draftToEdit.type === 'text') {
      setMessage(draftToEdit.message);
      setEditIndex(index);
      setEditModalOpen(true);
    } else {
      alert('Editing is only supported for text drafts');
    }
  };

  const handleSaveEdit = () => {
    if (message.trim()) {
      const updatedDrafts = [...drafts];
      updatedDrafts[editIndex] = { ...updatedDrafts[editIndex], message, type: 'text' };
      setDrafts(updatedDrafts);
      setMessage('');
      setEditModalOpen(false);
      setEditIndex(null);
    }
  };

  const handleDeleteDraft = (index) => {
    const updatedDrafts = drafts.filter((_, i) => i !== index);
    setDrafts(updatedDrafts);
  };

  const handleSendClick = () => {
    if (!drafts.length || isSending || !selectedWebhookUrl) {
      if (!isSending && !selectedWebhookUrl) {
        alert('Please select a webhook before sending drafts.');
      } else if (!isSending && drafts.length === 0) {
        alert('No drafts to send');
      }
      return;
    }
    setIsSendConfirmOpen(true);
  };

  const getDraftSummary = () => {
    const summary = {};
    drafts.forEach((draft) => {
      const { webhookName, type } = draft;
      if (!summary[webhookName]) {
        summary[webhookName] = { text: 0, image: 0, audio: 0 };
      }
      if (type === 'text') summary[webhookName].text += 1;
      else if (type === 'image') summary[webhookName].image += 1;
      else if (type === 'audio') summary[webhookName].audio += 1;
    });
    return summary;
  };

  const sendDraftWithRetry = async (draft, webhookUrl, retries = 3, delay = 1000) => {
    const formData = new FormData();

    if (draft.type === 'text') {
      // Format timestamp WIB (UTC+7)
      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000; // 7 jam dalam milidetik
      const wibTime = new Date(now.getTime() + wibOffset);
      const timestampWIB = wibTime.toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
        timeZone: 'UTC',
      });

      // Buat payload untuk embed (khusus teks)
      const payload = {
        embeds: [
          {
            description: draft.message,
            color: 16776960, // Kuning (#FFFF00)
            footer: {
              text: `🍣 Seraya Store ・ ${timestampWIB}`,
            },
          },
        ],
      };

      // Tambahkan payload sebagai JSON ke FormData
      formData.append('payload_json', JSON.stringify(payload));
    } else if (draft.type === 'image' || draft.type === 'audio') {
      // Untuk gambar dan audio, kirim sebagai file biasa
      const blob = dataURLtoBlob(draft.message);
      const fileHash = md5(draft.message);
      const fileExtension = draft.type === 'image' ? 'png' : 'mp3'; // Ubah ke PNG untuk gambar
      const newFileName = `${fileHash}.${fileExtension}`;
      formData.append('file', blob, newFileName);
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Failed to send ${draft.type} message: ${response.statusText}`);
        }
        return true;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        console.warn(`Attempt ${attempt} failed for draft ${draft.id}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const confirmSend = async () => {
    setIsSendConfirmOpen(false);
    setIsSending(true);
    const draftsToSend = drafts.filter((draft) => !sentDraftIds[draft.id]);
    setSendProgress({ sent: 0, total: draftsToSend.length });
    try {
      const newSentIds = { ...sentDraftIds };
  
      if (draftsToSend.length === 0) {
        alert('All drafts have already been sent.');
        setDrafts([]);
        setIsSending(false);
        return;
      }
  
      const draftsByWebhook = draftsToSend.reduce((acc, draft) => {
        if (!acc[draft.webhookName]) {
          acc[draft.webhookName] = [];
        }
        acc[draft.webhookName].push(draft);
        return acc;
      }, {});
  
      for (const [webhookName, draftsForWebhook] of Object.entries(draftsByWebhook)) {
        const webhookUrl = webhookUrls[webhookName];
        if (!webhookUrl) {
          console.warn(`No URL found for webhook: ${webhookName}. Skipping...`);
          continue;
        }
  
        // Inisialisasi summary untuk webhook ini
        const sendSummary = { text: 0, image: 0, audio: 0 };
  
        // Kirim semua draft untuk webhook ini
        for (const draft of draftsForWebhook) {
          const success = await sendDraftWithRetry(draft, webhookUrl);
          if (success) {
            newSentIds[draft.id] = Date.now();
            setSendProgress((prev) => ({ ...prev, sent: prev.sent + 1 }));
            // Update summary berdasarkan tipe draft
            if (draft.type === 'text') sendSummary.text += 1;
            else if (draft.type === 'image') sendSummary.image += 1;
            else if (draft.type === 'audio') sendSummary.audio += 1;
            await new Promise((resolve) => setTimeout(resolve, sendDelay * 1000));
          }
        }
  
        // Buat dan kirim log untuk webhook ini setelah semua draftnya selesai, kecuali untuk "Testing Website"
        if (webhookName !== 'Testing Website') {
          const parts = [];
          if (sendSummary.text > 0) parts.push(`${sendSummary.text} pesan`);
          if (sendSummary.image > 0) parts.push(`${sendSummary.image} gambar`);
          if (sendSummary.audio > 0) parts.push(`${sendSummary.audio} audio`);
          if (parts.length > 0) {
            const logMessage = `[${webhookName}] mengirim ${parts.join(', ')}`;
            await sendLogToWebhook(logMessage);
          }
        }
      }
  
      setSentDraftIds(newSentIds);
      setDrafts([]);
    } catch (error) {
      console.error('Error sending messages:', error);
      const errorLog = "Ada yang nyasar, cek konsol ya!";
      await sendLogToWebhook(errorLog);
    } finally {
      setIsSending(false);
      setSendProgress({ sent: 0, total: 0 });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = drafts.findIndex((draft) => draft.id === active.id);
      const newIndex = drafts.findIndex((draft) => draft.id === over.id);
      setDrafts(arrayMove(drafts, oldIndex, newIndex));
    }
  };

  const toggleCollapse = (webhookName) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [webhookName]: !prev[webhookName],
    }));
  };

  const handleImageClick = (imageUrl) => {
    setPreviewImage(imageUrl);
    setCrop({
      unit: '%',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    });
    setCompletedCrop(null);
    setIsPreviewOpen(true);
  };

  const closePreviewModal = () => {
    setIsPreviewOpen(false);
    setPreviewImage('');
    setCompletedCrop(null);
    setCrop({ unit: '%', x: 25, y: 25, width: 50, height: 50 }); // Reset crop
  };

  // Fungsi getCroppedImage untuk crop tanpa kompresi (PNG)
  const getCroppedImage = useCallback(() => {
    if (!completedCrop || !imgRef.current) return null;
  
    return new Promise((resolve) => {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      // Set dimensi canvas sesuai crop
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
  
      // Pastikan kualitas gambar tetap baik
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
  
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
  
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            // Tambahkan watermark pada gambar yang sudah di-crop
            addWatermark(reader.result)
              .then((watermarkedImage) => resolve(watermarkedImage))
              .catch(() => resolve(reader.result)); // Fallback tanpa watermark jika gagal
          };
          reader.readAsDataURL(blob);
        },
        'image/png',
        1 // Kualitas maksimum
      );
    });
  }, [completedCrop]);

  const handleSaveCrop = async () => {
    const croppedImage = await getCroppedImage();
    if (croppedImage) {
      const draftIndex = drafts.findIndex((draft) => draft.message === previewImage);
      if (draftIndex !== -1) {
        const updatedDrafts = [...drafts];
        updatedDrafts[draftIndex] = { 
          ...updatedDrafts[draftIndex], 
          message: croppedImage,
          type: 'image' // Pastikan tipe tetap image
        };
        setDrafts(updatedDrafts);
      }
      closePreviewModal();
    }
  };

  // Fungsi untuk menghapus timestamp
  const removeTimestamps = (text) => {
    const timestampRegex = /(\b\d{1,2}[:;,]\d{2}|\b\d{4})\s*(AM|PM|aM|Am|pm|Pm|am)?\b/g;
    return text.replace(timestampRegex, '').trim();
  };

  // Fungsi untuk mengonversi gambar ke teks menggunakan OCRSpace
  const convertImageToText = async (imageFile) => {
    setIsOcrLoading(true);
    let attempts = 0;
    const maxAttempts = ocrApiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = ocrApiKeys[currentApiKeyIndex];
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', false);

      try {
        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { 'apikey': apiKey },
          body: formData,
        });

        const result = await response.json();
        if (response.ok && result.ParsedResults && result.ParsedResults.length > 0) {
          const ocrText = result.ParsedResults[0].ParsedText;
          const cleanedText = removeTimestamps(ocrText);
          setMessage(cleanedText);
          setIsOcrLoading(false);
          return;
        } else if (response.status === 429 || (result && result.ErrorMessage && result.ErrorMessage.includes('limit'))) {
          setCurrentApiKeyIndex((prev) => (prev + 1) % ocrApiKeys.length);
          attempts++;
          continue;
        } else {
          throw new Error(result.ErrorMessage || 'OCR failed');
        }
      } catch (error) {
        console.error('OCR Error:', error);
        if (attempts === maxAttempts - 1) {
          alert('Failed to convert image to text. All API keys exhausted or error occurred.');
          setIsOcrLoading(false);
          return;
        }
        setCurrentApiKeyIndex((prev) => (prev + 1) % ocrApiKeys.length);
        attempts++;
      }
    }
    setIsOcrLoading(false);
  };

  // Handler untuk upload gambar
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid image file.');
    }
  };

  // Handler untuk klik tombol Convert to Text
  const handleConvertToText = () => {
    if (!uploadedImage) {
      alert('Please upload an image first.');
      return;
    }
    const blob = dataURLtoBlob(uploadedImage);
    const file = new File([blob], 'uploaded_image.png', { type: 'image/png' });
    convertImageToText(file);
  };

  const groupedDrafts = drafts.reduce((acc, draft) => {
    if (!acc[draft.webhookName]) {
      acc[draft.webhookName] = [];
    }
    acc[draft.webhookName].push(draft);
    return acc;
  }, {});

  // Tambahkan useEffect untuk validasi sebelum meninggalkan halaman
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (drafts.length > 0) {
        // Pesan ini akan ditampilkan oleh browser (catatan: pesan kustom mungkin tidak ditampilkan di semua browser modern)
        const message = 'You have unsent drafts. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message; // Standar modern untuk memicu dialog konfirmasi
        return message;
      }
    };

    // Tambahkan event listener saat komponen dimount
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Bersihkan event listener saat komponen di-unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [drafts.length]); // Dependensi pada drafts.length agar efek berjalan saat jumlah draft berubah

  // Tambahkan useEffect untuk membersihkan event listeners
  useEffect(() => {
    const cleanup = () => {
      setIsDraggingOver(false);
    };

    // Tambahkan event listener untuk membersihkan state saat user meninggalkan window
    window.addEventListener('blur', cleanup);
    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('blur', cleanup);
      window.removeEventListener('beforeunload', cleanup);
    };
  }, []);

  const handleRemoveAllDrafts = (webhookName) => {
    if (confirm(`Apakah Anda yakin ingin menghapus semua draft untuk ${webhookName}?`)) {
      setDrafts(prevDrafts => prevDrafts.filter(draft => draft.webhookName !== webhookName));
    }
  };

  // Tambahkan fungsi untuk mengatur aspect ratio
  const handleAspectRatioChange = (ratio) => {
    setAspectRatio(ratio);
    // Reset crop ketika aspect ratio berubah
    setCrop({ unit: '%', x: 25, y: 25, width: 50, height: ratio ? 50 / ratio : 50 });
  };

  return (
    <div
      className="min-h-screen bg-[#1a1a1a] relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="fixed inset-0 bg-[#111827] bg-opacity-75 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-white text-2xl font-bold bg-[#6366F1] px-8 py-4 rounded-lg">
            Drop files here to upload to {selectedWebhookName || 'selected webhook'}
          </div>
        </div>
      )}
      <Navbar
        onWebhookSelect={handleWebhookSelect}
        onNewChat={handleNewChat}
        onDelayChange={setSendDelay}
        currentDelay={sendDelay}
      />
      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {drafts.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-[#6366F1] text-6xl mb-4">📝</div>
                <div className="text-[#E5E7EB] text-xl font-medium">No drafts yet</div>
                <div className="text-[#9CA3AF] mt-2">Start by selecting a webhook and clicking "New Chat"</div>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {Object.keys(groupedDrafts).map((webhookName) => {
                  const isCollapsed = collapsedSections[webhookName] || false;
                  const draftsInGroup = groupedDrafts[webhookName];
                  const columnCount = Math.min(draftsInGroup.length, 5);
                  return (
                    <div
                      key={webhookName}
                      className="bg-[#2d2d2d] p-6 rounded-xl border border-[#404040] mb-6 hover:border-[#6366F1] transition-colors duration-300"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <h3 className="text-3xl font-bold text-[#E5E7EB]">{webhookName}</h3>
                          <span className="ml-3 text-sm text-[#9CA3AF] bg-[#404040] px-3 py-1 rounded-full">
                            {draftsInGroup.length} draft{draftsInGroup.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleRemoveAllDrafts(webhookName)}
                            className="text-[#EF4444] hover:text-[#DC2626] focus:outline-none font-medium flex items-center"
                          >
                            <Trash2 size={16} className="mr-1" />
                            <span>Remove All</span>
                          </button>
                          <button
                            onClick={() => toggleCollapse(webhookName)}
                            className="text-[#6366F1] hover:text-[#4F46E5] focus:outline-none font-medium"
                          >
                            {isCollapsed ? 'Expand' : 'Collapse'}
                          </button>
                        </div>
                      </div>
                      {!isCollapsed && (
                        <SortableContext items={draftsInGroup.map((draft) => draft.id)} strategy={verticalListSortingStrategy}>
                          <div
                            className={`grid gap-6 ${
                              columnCount === 1
                                ? 'grid-cols-1'
                                : columnCount === 2
                                ? 'grid-cols-2'
                                : columnCount === 3
                                ? 'grid-cols-3'
                                : columnCount === 4
                                ? 'grid-cols-4'
                                : 'grid-cols-5'
                            }`}
                          >
                            {draftsInGroup.map((draft, index) => {
                              const globalIndex = drafts.findIndex((d) => d.id === draft.id);
                              return (
                                <SortableDraft
                                  key={draft.id}
                                  draft={draft}
                                  index={index}
                                  globalIndex={globalIndex}
                                  handleEditDraft={handleEditDraft}
                                  handleDeleteDraft={handleDeleteDraft}
                                  onImageClick={handleImageClick}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      )}
                    </div>
                  );
                })}
              </DndContext>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center space-y-2">
        <div className="flex space-x-4">
          <button
            onClick={backupImagesToDrive}
            disabled={isBackingUp || drafts.length === 0 || !selectedWebhookUrl}
            className={`bg-[#6366F1] text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-sm inline-flex items-center space-x-2 ${
              isBackingUp || drafts.length === 0 || !selectedWebhookUrl
                ? 'opacity-50 cursor-not-allowed bg-gray-600'
                : 'hover:bg-[#4F46E5] hover:shadow-md active:transform active:scale-95'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 50 50"
              width="20"
              height="20"
              className="fill-current"
            >
              <path d="M30.418,6H18.582c-0.724,0-1.392,0.391-1.745,1.023L3.423,30.988c-0.359,0.642-0.337,1.429,0.057,2.05l6.38,10.035 C10.228,43.65,10.864,44,11.548,44h25.903c0.684,0,1.321-0.35,1.688-0.927l6.38-10.035c0.395-0.621,0.417-1.408,0.057-2.05 L32.163,7.023C31.809,6.391,31.142,6,30.418,6z M30.41,8L43.3,31H32.61L20.65,8H30.41z M30.35,31H18.47l5.98-11.34L30.35,31z M5.16,31.97L18.49,8.19l4.84,9.31L10.92,41.01L5.16,31.97z M37.45,42H12.66l4.75-9h25.77L37.45,42z" />
            </svg>
            <span>
              {isBackingUp
                ? 'Backing Up...'
                : drafts.length === 0
                ? 'No Drafts'
                : !selectedWebhookUrl
                ? 'Select Webhook'
                : 'Backup'}
              {drafts.length > 0 && !isBackingUp && selectedWebhookUrl &&
                ` (${drafts.filter(d => d.type === 'image').length})`}
            </span>
          </button>
          <button
            onClick={handleSendClick}
            disabled={drafts.length === 0 || isSending || !selectedWebhookUrl}
            className={`bg-[#10B981] text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-sm inline-flex items-center space-x-2 ${
              drafts.length === 0 || isSending || !selectedWebhookUrl
                ? 'opacity-50 cursor-not-allowed bg-gray-600'
                : 'hover:bg-[#059669] hover:shadow-md active:transform active:scale-95'
            }`}
          >
            <Send size={20} className="stroke-2" />
            <span>
              {isSending
                ? 'Sending...'
                : drafts.length === 0
                ? 'No Drafts'
                : !selectedWebhookUrl
                ? 'Select Webhook'
                : 'Send'}
              {drafts.length > 0 && !isSending && selectedWebhookUrl && ` (${drafts.length})`}
            </span>
          </button>
        </div>
        {isBackingUp && (
          <div className="w-64">
            <div className="text-[#9CA3AF] text-sm mb-1 flex items-center space-x-2">
              <Clock size={16} />
              <span>Backing up {backupProgress.backedUp} of {backupProgress.total} images...</span>
            </div>
            <div className="w-full bg-[#404040] rounded-full h-2.5">
              <div
                className="bg-[#6366F1] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(backupProgress.backedUp / backupProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        {isSending && (
          <div className="w-64">
            <div className="text-[#9CA3AF] text-sm mb-1 flex items-center space-x-2">
              <Clock size={16} />
              <span>Sending {sendProgress.sent} of {sendProgress.total} drafts...</span>
            </div>
            <div className="w-full bg-[#404040] rounded-full h-2.5">
              <div
                className="bg-[#10B981] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {
        isUpscaleModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upscale Images</h2>
              <p className="text-gray-600 mb-4">
                {pendingImages.length} image(s) detected. Pilih faktor upscale untuk meningkatkan resolusi semua gambar:
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4 max-h-[40vh] overflow-y-auto">
                {pendingImages.map((imageData, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <img
                      src={imageData.dataURL}
                      alt={`Preview ${index + 1}`}
                      className="max-h-32 w-full object-contain rounded-lg"
                    />
                    <p className="text-sm text-gray-600 mt-2 truncate w-full text-center">
                      {imageData.originalFile.name}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="mb-4">
                <select
                  value={upscaleFactor}
                  onChange={(e) => setUpscaleFactor(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  disabled={isUpscaling}
                >
                  <option value={2}>2x (Double Resolution)</option>
                  <option value={4}>4x (Quadruple Resolution)</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsUpscaleModalOpen(false);
                    setPendingImages([]);
                    setUpscaleFactor(2);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isUpscaling}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSkip}
                  disabled={isUpscaling}
                  className={`bg-[#9CA3AF] text-white px-4 py-2 rounded-lg transition-all duration-300 ${
                    isUpscaling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#6B7280]'
                  }`}
                >
                  {isUpscaling ? 'Processing...' : 'Skip'}
                </button>
                <button
                  onClick={handleUpscaleConfirm}
                  disabled={isUpscaling}
                  className={`bg-[#6366F1] text-white px-4 py-2 rounded-lg transition-all duration-300 ${
                    isUpscaling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#4F46E5]'
                  }`}
                >
                  {isUpscaling ? 'Upscaling...' : 'Upscale & Save All'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {isSendConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Send</h2>
            <div className="text-gray-600 mb-4">
              <p className="mb-2">You are about to send the following drafts:</p>
              <div className="space-y-1">
                {Object.entries(getDraftSummary()).map(([webhookName, counts]) => (
                  <p key={webhookName} className="text-sm">
                    {counts.text} Message {counts.image} Image {counts.audio} Audio to{' '}
                    <span className="font-semibold">{webhookName}</span>
                  </p>
                ))}
              </div>
            </div>
            <p className="text-gray-600 mb-4">Are you sure you want to proceed?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsSendConfirmOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg transition-all duration-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Message</h2>
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            {uploadedImage && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Image Preview:</p>
                <img
                  src={uploadedImage}
                  alt="Preview"
                  className="max-h-40 w-full object-contain rounded-lg"
                />
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleConvertToText}
                disabled={isOcrLoading || !uploadedImage}
                className={`bg-[#10B981] text-white px-4 py-2 rounded-lg transition-all duration-300 ${
                  isOcrLoading || !uploadedImage ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#059669]'
                }`}
              >
                {isOcrLoading ? 'Converting...' : 'Convert to Text'}
              </button>
              <p className="text-sm text-gray-600">Using Key #{currentApiKeyIndex + 1}</p>
            </div>
            <textarea
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Type your message here or convert an image..."
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setUploadedImage(null);
                  setMessage('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 rounded-lg transition-all duration-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Message</h2>
            <textarea
              value={message}
              onChange={handleMessageChange}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Edit your message here..."
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setMessage('');
                  setEditIndex(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 rounded-lg transition-all duration-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {
        isPreviewOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="relative bg-[#2d2d2d] p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <button
                onClick={closePreviewModal}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-300 z-10"
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold text-white mb-4">Crop Image</h2>
                
                {/* Tambahkan pilihan aspect ratio */}
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => handleAspectRatioChange(null)}
                    className={`px-3 py-1 rounded ${
                      aspectRatio === null
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#404040] text-gray-300 hover:bg-[#505050]'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => handleAspectRatioChange(1)}
                    className={`px-3 py-1 rounded ${
                      aspectRatio === 1
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#404040] text-gray-300 hover:bg-[#505050]'
                    }`}
                  >
                    1:1
                  </button>
                  <button
                    onClick={() => handleAspectRatioChange(4/3)}
                    className={`px-3 py-1 rounded ${
                      aspectRatio === 4/3
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#404040] text-gray-300 hover:bg-[#505050]'
                    }`}
                  >
                    4:3
                  </button>
                  <button
                    onClick={() => handleAspectRatioChange(16/9)}
                    className={`px-3 py-1 rounded ${
                      aspectRatio === 16/9
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#404040] text-gray-300 hover:bg-[#505050]'
                    }`}
                  >
                    16:9
                  </button>
                  <button
                    onClick={() => handleAspectRatioChange(3/4)}
                    className={`px-3 py-1 rounded ${
                      aspectRatio === 3/4
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#404040] text-gray-300 hover:bg-[#505050]'
                    }`}
                  >
                    3:4
                  </button>
                  <button
                    onClick={() => handleAspectRatioChange(9/16)}
                    className={`px-3 py-1 rounded ${
                      aspectRatio === 9/16
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#404040] text-gray-300 hover:bg-[#505050]'
                    }`}
                  >
                    9:16
                  </button>
                </div>
                
                <div className="relative w-full flex justify-center bg-[#1a1a1a] rounded-lg overflow-hidden">
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspectRatio}
                    className="max-h-[60vh]"
                  >
                    <img
                      ref={imgRef}
                      src={previewImage}
                      alt="Image to crop"
                      className="max-h-[60vh] w-auto"
                      style={{ objectFit: 'contain' }}
                      onLoad={() => {
                        setCompletedCrop(null);
                      }}
                      onError={() => {
                        console.error('Failed to load image for cropping');
                        closePreviewModal();
                      }}
                    />
                  </ReactCrop>
                </div>

                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={closePreviewModal}
                    className="px-6 py-2 text-white hover:bg-[#404040] border border-[#404040] rounded-lg transition-colors duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCrop}
                    disabled={!completedCrop}
                    className={`px-6 py-2 rounded-lg transition-all duration-300 inline-flex items-center space-x-2 ${
                      completedCrop 
                        ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5]' 
                        : 'bg-[#404040] text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <CropIcon size={20} />
                    <span>Save Crop</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}

export default App;