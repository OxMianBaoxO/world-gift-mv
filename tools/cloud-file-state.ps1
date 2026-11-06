param([Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class MVCloudState {
  [StructLayout(LayoutKind.Sequential)] public struct TagInfo { public uint Attributes; public uint ReparseTag; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern SafeFileHandle CreateFileW(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool GetFileInformationByHandleEx(SafeFileHandle h, int infoClass, out TagInfo info, uint size);
  [DllImport("cldapi.dll")]
  public static extern uint CfGetPlaceholderStateFromAttributeTag(uint attrs, uint tag);
}
'@
$taskCloudHandle = [MVCloudState]::CreateFileW($FilePath,0,7,[IntPtr]::Zero,3,0x02000000,[IntPtr]::Zero)
if ($taskCloudHandle.IsInvalid) { throw "Open failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
try {
  $taskTag = New-Object MVCloudState+TagInfo
  if (![MVCloudState]::GetFileInformationByHandleEx($taskCloudHandle,9,[ref]$taskTag,8)) { throw "Metadata query failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
  $taskState = [MVCloudState]::CfGetPlaceholderStateFromAttributeTag($taskTag.Attributes,$taskTag.ReparseTag)
  [pscustomobject]@{Path=$FilePath;At=(Get-Date -Format o);State=$taskState;Attributes=('0x{0:X8}' -f $taskTag.Attributes);ReparseTag=('0x{0:X8}' -f $taskTag.ReparseTag);IsCloudPlaceholder=($taskState -ne [uint32]::MaxValue -and ($taskState -band 1) -ne 0);InSync=($taskState -ne [uint32]::MaxValue -and ($taskState -band 8) -ne 0)} | ConvertTo-Json
} finally { $taskCloudHandle.Dispose() }
