import React, { useState, useEffect } from 'react';
import { User, getUsers, addUser, setActiveUserKey, getActiveUserKey, clearActiveUser, clearRecDataCache } from '../utils/sessionLogger';
import './UserManager.css';

interface UserManagerProps {
  onUserSelected: () => void;
}

export const UserManager: React.FC<UserManagerProps> = ({ onUserSelected }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserKey, setNewUserKey] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ユーザー一覧を読み込み
    const loadedUsers = getUsers();
    setUsers(loadedUsers);
    
    // activeUserが既に存在する場合はメイン画面へ
    const activeUserKey = getActiveUserKey();
    if (activeUserKey) {
      const user = loadedUsers.find(u => u.userKey === activeUserKey);
      if (user) {
        onUserSelected();
      } else {
        // activeUserKeyが存在するが、対応するユーザーが見つからない場合
        // これはデータ不整合の可能性があるので、activeUserをクリア
        console.warn('Active user key found but user not found, clearing active user');
        clearActiveUser();
      }
    }
  }, [onUserSelected]);

  const handleCreateUser = () => {
    setError(null);
    
    // バリデーション
    if (!newUserKey.trim()) {
      setError('ユーザーキーを入力してください');
      return;
    }
    if (!newDisplayName.trim()) {
      setError('表示名を入力してください');
      return;
    }
    
    // ユーザー作成
    const newUser: User = {
      userKey: newUserKey.trim(),
      displayName: newDisplayName.trim(),
      isPublic: newIsPublic,
      createdAt: Date.now(),
    };
    
    const success = addUser(newUser);
    if (!success) {
      setError('このユーザーキーは既に使用されています');
      return;
    }
    
    // 作成したユーザーをアクティブにする
    setActiveUserKey(newUser.userKey);
    
    // recデータのキャッシュをクリア（新しいユーザーのデータを取得するため）
    clearRecDataCache();
    
    // ユーザー一覧を更新
    const updatedUsers = getUsers();
    setUsers(updatedUsers);
    
    // フォームをリセット
    setNewUserKey('');
    setNewDisplayName('');
    setNewIsPublic(true);
    setShowCreateForm(false);
    
    // メイン画面へ
    onUserSelected();
  };

  const handleSelectUser = (userKey: string) => {
    setActiveUserKey(userKey);
    // recデータのキャッシュをクリア（ユーザー切替時）
    clearRecDataCache();
    onUserSelected();
  };

  return (
    <div className="user-manager">
      <h1>Chemistry Drill</h1>
      <p className="user-manager-description">ユーザーを選択または作成してください</p>
      
      {error && (
        <div className="user-manager-error">
          {error}
        </div>
      )}
      
      {showCreateForm ? (
        <div className="user-create-form">
          <h2>ユーザー作成</h2>
          <div className="form-group">
            <label>ユーザーキー:</label>
            <input
              type="text"
              value={newUserKey}
              onChange={(e) => setNewUserKey(e.target.value)}
              placeholder="出席番号やPINなど"
            />
          </div>
          <div className="form-group">
            <label>表示名:</label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="表示名"
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={newIsPublic}
                onChange={(e) => setNewIsPublic(e.target.checked)}
              />
              公開（ランキングに表示）
            </label>
          </div>
          <div className="form-actions">
            <button onClick={handleCreateUser} className="create-button">
              作成
            </button>
            <button onClick={() => { setShowCreateForm(false); setError(null); }} className="cancel-button">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="user-list">
            {users.length === 0 ? (
              <p className="no-users">ユーザーが登録されていません</p>
            ) : (
              users.map(user => (
                <div key={user.userKey} className="user-item">
                  <div className="user-info">
                    <div className="user-name">{user.displayName}</div>
                    <div className="user-key">キー: {user.userKey}</div>
                    <div className="user-public">{user.isPublic ? '公開' : '非公開'}</div>
                  </div>
                  <button
                    onClick={() => handleSelectUser(user.userKey)}
                    className="select-button"
                  >
                    選択
                  </button>
                </div>
              ))
            )}
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="create-new-button"
          >
            新規ユーザー作成
          </button>
        </>
      )}
    </div>
  );
};
