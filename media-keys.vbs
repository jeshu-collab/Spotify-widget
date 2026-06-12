Set ws = CreateObject("WScript.Shell")
Select Case WScript.Arguments(0)
    Case "next"
        ws.SendKeys(chr(176))
    Case "prev"
        ws.SendKeys(chr(177))
    Case "toggle"
        ws.SendKeys(chr(179))
End Select